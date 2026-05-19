import { apiFetch } from './client';

const adminUsersAPI = {
  list: () => apiFetch('/api/admin/users'),
  create: (payload) => apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (userId, payload) => apiFetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  resetPassword: (userId, newPassword) => apiFetch(`/api/admin/users/${userId}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  }),
};

export default adminUsersAPI;
