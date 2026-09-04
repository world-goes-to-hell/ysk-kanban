export class ApiError extends Error {
  constructor(code, status, message, options) {
    super(message, options);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const MESSAGES = {
  unauthorized: 'API Key 가 올바르지 않습니다. 설정을 확인해 주십시오.',
  not_found: '요청한 항목을 찾을 수 없습니다.',
  bad_request: '요청이 올바르지 않습니다.',
  network: '서버에 연결하지 못했습니다. 주소와 네트워크를 확인해 주십시오.',
  server: '서버에서 오류가 발생했습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
};

/** 서버가 오류 설명을 담아 보내는 키들. 앞의 것을 먼저 쓴다. */
const MESSAGE_KEYS = ['message', 'error', 'detail'];

function classify(status) {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 400) return 'bad_request';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * 오류 응답에서 서버가 준 설명을 꺼낸다. 꺼내지 못하면 null 이다.
 *
 * 이 설명이 없으면 필드 이름을 틀렸을 때조차 '알 수 없는 오류' 만 보여
 * 원인을 찾을 길이 없다. 다만 본문을 읽다 넘어지면 진짜 오류를 덮어 버리므로
 * 어느 단계에서 실패하든 null 을 돌려주고 기본 문구로 넘어간다.
 */
async function serverMessage(res) {
  let text;
  try {
    text = await res.text();
  } catch {
    return null;
  }
  if (!text) return null;

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    // JSON 이 아니면 HTML 오류 페이지일 수 있다. 그대로 보여주면 화면이 망가진다.
    return null;
  }

  if (typeof body === 'string') return body.trim() || null;

  for (const key of MESSAGE_KEYS) {
    const found = body?.[key];
    if (typeof found === 'string' && found.trim()) return found.trim();
  }
  return null;
}

export function createClient({ apiUrl, apiKey, fetchImpl = globalThis.fetch }) {
  const base = apiUrl.replace(/\/+$/, '');

  async function request(path, { method = 'GET', body, parse = true } = {}) {
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    let res;
    try {
      res = await fetchImpl(`${base}${path}`, init);
    } catch (cause) {
      throw new ApiError('network', 0, MESSAGES.network, { cause });
    }

    if (!res.ok) {
      const code = classify(res.status);
      const detail = await serverMessage(res);
      throw new ApiError(code, res.status, detail ?? MESSAGES[code]);
    }

    if (!parse) return undefined;
    return res.json();
  }

  const q = (projectId) => (projectId == null ? '' : `?projectId=${projectId}`);

  return {
    listProjects: () => request('/api/projects'),
    listStatuses: (projectId) => request(`/api/statuses${q(projectId)}`),
    listTodos: (projectId) => request(`/api/todos${q(projectId)}`),
    getTodo: (id) => request(`/api/todos/${id}`),

    createTodo: (projectId, fields) =>
      request('/api/todos', { method: 'POST', body: { ...fields, projectId } }),
    updateTodo: (id, patch) =>
      request(`/api/todos/${id}`, { method: 'PUT', body: patch }),
    // 서버는 본문에서 status 를 읽는다. statusKey 로 보내면 값을 찾지 못해 400 을 던진다.
    changeStatus: (id, statusKey) =>
      request(`/api/todos/${id}/status`, { method: 'PUT', body: { status: statusKey } }),
    deleteTodo: (id) =>
      request(`/api/todos/${id}`, { method: 'DELETE', parse: false }),

    listSubtasks: (id) => request(`/api/todos/${id}/subtasks`),
    createSubtask: (parentId, fields) =>
      request(`/api/todos/${parentId}/subtasks`, { method: 'POST', body: fields }),

    listComments: (id) => request(`/api/todos/${id}/comments`),
    addComment: (id, content) =>
      request(`/api/todos/${id}/comments`, { method: 'POST', body: { content } }),
  };
}
