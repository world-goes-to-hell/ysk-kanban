import { apiFetch } from './client';

const commentReadAPI = {
  markAsRead: (todoId) => apiFetch(`/api/todos/${todoId}/comments/read`, { method: 'POST' }),
  getUnreadCounts: (todoIds) => apiFetch(`/api/todos/unread-comments?todoIds=${todoIds.join(',')}`),
};

export default commentReadAPI;
