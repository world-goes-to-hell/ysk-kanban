import { apiFetch } from './client';

const attachmentAPI = {
  list:   (todoId) => apiFetch(`/api/todos/${todoId}/attachments`),
  upload: (todoId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch(`/api/todos/${todoId}/attachments`, { method: 'POST', body: fd });
  },
  getUrl: (todoId, attId) => `/api/todos/${todoId}/attachments/${attId}`,
  delete: (todoId, attId) => apiFetch(`/api/todos/${todoId}/attachments/${attId}`, { method: 'DELETE' }),
};

export default attachmentAPI;
