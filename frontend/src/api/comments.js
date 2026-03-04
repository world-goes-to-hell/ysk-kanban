import { apiFetch } from './client';

const commentAPI = {
  list:   (todoId) => apiFetch(`/api/todos/${todoId}/comments`),
  create: (todoId, content) => apiFetch(`/api/todos/${todoId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  update: (todoId, commentId, content) => apiFetch(`/api/todos/${todoId}/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  delete: (todoId, commentId) => apiFetch(`/api/todos/${todoId}/comments/${commentId}`, { method: 'DELETE' }),
};

export default commentAPI;
