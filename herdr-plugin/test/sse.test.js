import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { watchBoard, parseFrames } from '../src/api/sse.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('watchBoard', () => {
  it('SSE 연결에 성공하면 live 를 알린다', async () => {
    const onStatus = vi.fn();
    const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(': ok\n\n')); } });
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, body });

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus, fetchImpl });
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenCalledWith('live');
    stop();
  });

  it('SSE 연결에 실패하면 polling 으로 강등한다', async () => {
    const onStatus = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus, fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenCalledWith('polling');
    stop();
  });

  it('폴링 모드에서 주기마다 onChange 를 부른다', async () => {
    const onChange = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange, onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(2500);
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
    stop();
  });

  it('stop 을 부르면 더 이상 갱신하지 않는다', async () => {
    const onChange = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange, onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(1500);
    const before = onChange.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(onChange.mock.calls.length).toBe(before);
  });

  it('URL 에 projectId 를 붙이지 않는다 (서버가 받지 않음)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));
    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://k.example/api/sse/subscribe');
    stop();
  });

  it('Bearer 헤더와 event-stream Accept 를 보낸다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));
    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    const init = fetchImpl.mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer ak_1');
    expect(init.headers.Accept).toBe('text/event-stream');
    stop();
  });
});

describe('parseFrames', () => {
  it('완성된 프레임을 떼어낸다', () => {
    const { frames } = parseFrames('event: todo_changed\ndata: {"projectId":3}\n\n');
    expect(frames).toEqual([{ event: 'todo_changed', data: '{"projectId":3}' }]);
  });

  it('덜 온 조각은 rest 로 남긴다', () => {
    const { frames, rest } = parseFrames('event: a\ndata: 1\n\nevent: b\ndata: 2');
    expect(frames).toHaveLength(1);
    expect(rest).toBe('event: b\ndata: 2');
  });

  it('하트비트 주석은 프레임을 만들지 않는다', () => {
    expect(parseFrames(': heartbeat\n\n').frames).toEqual([]);
  });

  it('여러 프레임을 한 번에 처리한다', () => {
    const { frames } = parseFrames('event: a\ndata: 1\n\nevent: b\ndata: 2\n\n');
    expect(frames.map(f => f.event)).toEqual(['a', 'b']);
  });

  it('event 줄이 없으면 message 로 본다', () => {
    expect(parseFrames('data: 1\n\n').frames[0].event).toBe('message');
  });
});

describe('프로젝트 필터', () => {
  /** 주어진 프레임들을 한 덩어리로 흘려보내는 가짜 스트림 */
  function streamOf(text) {
    return new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode(text)); },
    });
  }

  async function runWith(text, projectId = 3) {
    const onChange = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, body: streamOf(text) });
    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId,
                              onChange, onStatus: vi.fn(), fetchImpl });
    await vi.advanceTimersByTimeAsync(10);
    stop();
    return onChange;
  }

  it('같은 프로젝트의 todo_changed 는 갱신한다', async () => {
    const onChange = await runWith('event: todo_changed\ndata: {"action":"updated","projectId":3}\n\n');
    expect(onChange).toHaveBeenCalled();
  });

  it('다른 프로젝트의 todo_changed 는 무시한다', async () => {
    const onChange = await runWith('event: todo_changed\ndata: {"action":"updated","projectId":99}\n\n');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('보드와 무관한 이벤트는 무시한다', async () => {
    const onChange = await runWith('event: notification\ndata: {"id":1}\n\n');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('comment_changed 는 프로젝트를 알 수 없으므로 갱신한다', async () => {
    const onChange = await runWith('event: comment_changed\ndata: {"todoId":1902}\n\n');
    expect(onChange).toHaveBeenCalled();
  });

  it('connected 이벤트만으로는 갱신하지 않는다', async () => {
    const onChange = await runWith('event: connected\ndata: ok\n\n');
    expect(onChange).not.toHaveBeenCalled();
  });
});
