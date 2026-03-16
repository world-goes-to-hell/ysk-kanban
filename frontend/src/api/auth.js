import { apiFetch } from './client';

const authAPI = {
  me:       () => apiFetch('/api/auth/me'),
  login:    (username, password) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username, password, displayName) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, displayName }) }),
  logout:   () => apiFetch('/api/auth/logout', { method: 'POST' }),
  refresh:  () => apiFetch('/api/auth/refresh', { method: 'POST' }),
  updateProfile: (displayName) => apiFetch('/api/auth/profile', { method: 'PATCH', body: JSON.stringify({ displayName }) }),
  changePassword: (currentPassword, newPassword) => apiFetch('/api/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),
};

export default authAPI;
