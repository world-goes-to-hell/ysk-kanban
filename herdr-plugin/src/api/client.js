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
  network: '서버에 연결하지 못했습니다. 주소와 네트워크를 확인해 주십시오.',
  server: '서버에서 오류가 발생했습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
};

function classify(status) {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'unknown';
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
      throw new ApiError(code, res.status, MESSAGES[code]);
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
    changeStatus: (id, statusKey) =>
      request(`/api/todos/${id}/status`, { method: 'PUT', body: { statusKey } }),
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
