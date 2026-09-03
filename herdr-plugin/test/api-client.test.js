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

  it('상태 변경은 statusKey 를 담아 PUT 한다', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 1 }));
    await clientWith(f).changeStatus(1, 'IN_PROGRESS');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://k.example/api/todos/1/status');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ statusKey: 'IN_PROGRESS' });
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
});

describe('응답 처리', () => {
  it('DELETE 는 본문을 읽지 않는다', async () => {
    const json = vi.fn();
    const f = vi.fn().mockResolvedValue({ ok: true, status: 204, json, text: async () => '' });
    await clientWith(f).deleteTodo(1);
    expect(json).not.toHaveBeenCalled();
  });
});
