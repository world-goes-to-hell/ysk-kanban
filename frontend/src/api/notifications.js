import { apiFetch } from './client';

const notificationAPI = {
  list:        () => apiFetch('/api/notifications'),
  unreadCount: () => apiFetch('/api/notifications/unread-count'),
  markAsRead:  (id) => apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiFetch('/api/notifications/read-all', { method: 'PUT' }),
};

export default notificationAPI;
