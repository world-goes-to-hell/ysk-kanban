import { apiFetch } from './client';

const discussionAPI = {
  listByTodo: (todoId) => apiFetch(`/api/todos/${todoId}/discussions`),
  start: (todoId) => apiFetch(`/api/todos/${todoId}/discussions`, {
    method: 'POST',
  }),
  end: (discussionId) => apiFetch(`/api/discussions/${discussionId}/end`, {
    method: 'POST',
  }),
  listMessages: (discussionId) => apiFetch(`/api/discussions/${discussionId}/messages`),
  postMessage: (discussionId, content) => apiFetch(`/api/discussions/${discussionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
};

export default discussionAPI;
