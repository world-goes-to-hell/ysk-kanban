import { describe, it, expect, vi } from 'vitest';
import { createClient, ApiError } from '../src/api/client.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => '' });
const fail = (status, body = '') => ({ ok: false, status, json: async () => ({}), text: async () => body });

function clientWith(fetchImpl) {
  return createClient({ apiUrl: 'https://k.example', apiKey: 'ak_test', fetchImpl });
}

describe('요청 구성', () => {
  it('Bearer 헤더를 붙인다', async () => {
    const f = vi.fn().mockResolvedValue(ok([]));
    await clientWith(f).listProjects();
    const [, init] = f.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer ak_test');
  });

  it('projectId 를 질의 문자열로 넘긴다', async () => {
    const f = vi.fn().mockResolvedValue(ok([]));
    await clientWith(f).listTodos(3);
    expect(f.mock.calls[0][0]).toBe('https://k.example/api/todos?projectId=3');
  });

  it('생성은 POST 로 보내고 본문을 JSON 으로 직렬화한다', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 1 }));
    await clientWith(f).createTodo(3, { summary: '테스트', priority: 'HIGH' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://k.example/api/todos');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ summary: '테스트', priority: 'HIGH', projectId: 3 });
  });

  it('상태 변경은 status 를 담아 PUT 한다', async () => {
    // 서버는 본문에서 status 를 읽는다. statusKey 로 보내면 값을 찾지 못해 400 을 던진다.
    const f = vi.fn().mockResolvedValue(ok({ id: 1 }));
    await clientWith(f).changeStatus(1, 'IN_PROGRESS');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://k.example/api/todos/1/status');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ status: 'IN_PROGRESS' });
  });
});

describe('오류 처리', () => {
  it('401 은 unauthorized 로 분류한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(401));
    await expect(clientWith(f).listProjects()).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
  });

  it('404 는 not_found 로 분류한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(404));
    await expect(clientWith(f).getTodo(9)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('500 은 server 로 분류한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(500));
    await expect(clientWith(f).listProjects()).rejects.toMatchObject({ code: 'server' });
  });

  it('연결 실패는 network 로 분류한다', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(clientWith(f).listProjects()).rejects.toMatchObject({ code: 'network' });
  });

  it('ApiError 는 Error 를 상속한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(401));
    await expect(clientWith(f).listProjects()).rejects.toBeInstanceOf(ApiError);
  });

  it('400 이면 code 가 bad_request 다', async () => {
    const f = vi.fn().mockResolvedValue(fail(400));
    await expect(clientWith(f).changeStatus(1, 'DONE'))
      .rejects.toMatchObject({ code: 'bad_request', status: 400 });
  });

  it('응답 본문에 message 가 있으면 그것이 오류 메시지가 된다', async () => {
    // 서버가 무엇이 잘못됐는지 알려 주는데 버리면 원인을 찾을 길이 없다.
    const f = vi.fn().mockResolvedValue(fail(400, JSON.stringify({ message: '상태를 입력하세요.' })));
    await expect(clientWith(f).changeStatus(1, 'DONE'))
      .rejects.toMatchObject({ code: 'bad_request', message: '상태를 입력하세요.' });
  });

  it('error 나 detail 키도 읽는다', async () => {
    const withError = vi.fn().mockResolvedValue(fail(400, JSON.stringify({ error: '값이 비었습니다.' })));
    await expect(clientWith(withError).changeStatus(1, 'DONE'))
      .rejects.toMatchObject({ message: '값이 비었습니다.' });

    const withDetail = vi.fn().mockResolvedValue(fail(400, JSON.stringify({ detail: '형식이 다릅니다.' })));
    await expect(clientWith(withDetail).changeStatus(1, 'DONE'))
      .rejects.toMatchObject({ message: '형식이 다릅니다.' });
  });

  it('본문이 비었거나 JSON 이 아니어도 예외 없이 기본 문구를 쓴다', async () => {
    const empty = vi.fn().mockResolvedValue(fail(400, ''));
    await expect(clientWith(empty).changeStatus(1, 'DONE'))
      .rejects.toMatchObject({ code: 'bad_request', message: '요청이 올바르지 않습니다.' });

    const html = vi.fn().mockResolvedValue(fail(500, '<html><body>Internal Error</body></html>'));
    await expect(clientWith(html).listProjects())
      .rejects.toMatchObject({ code: 'server', message: '서버에서 오류가 발생했습니다.' });

    // 본문을 읽는 것 자체가 실패해도 넘어져서는 안 된다
    const broken = vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({}),
      text: async () => { throw new Error('본문을 읽을 수 없다'); },
    });
    await expect(clientWith(broken).changeStatus(1, 'DONE'))
      .rejects.toMatchObject({ code: 'bad_request', message: '요청이 올바르지 않습니다.' });
  });
});

describe('응답 처리', () => {
  it('DELETE 는 본문을 읽지 않는다', async () => {
    const json = vi.fn();
    const f = vi.fn().mockResolvedValue({ ok: true, status: 204, json, text: async () => '' });
    await clientWith(f).deleteTodo(1);
    expect(json).not.toHaveBeenCalled();
  });
});
