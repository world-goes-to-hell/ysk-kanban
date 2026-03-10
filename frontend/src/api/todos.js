import { apiFetch } from './client';

const todoAPI = {
  list:         (projectId) => apiFetch(projectId ? `/api/todos?projectId=${projectId}` : '/api/todos'),
  get:          (id) => apiFetch(`/api/todos/${id}`),
  create:       (data) => apiFetch('/api/todos', { method: 'POST', body: JSON.stringify(data) }),
  update:       (id, data) => apiFetch(`/api/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeStatus: (id, status) => apiFetch(`/api/todos/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  reorder:      (orderedIds) => apiFetch('/api/todos/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
  delete:       (id) => apiFetch(`/api/todos/${id}`, { method: 'DELETE' }),
  report:       (params) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return apiFetch(`/api/todos/report${query ? `?${query}` : ''}`);
  },
};

export default todoAPI;
