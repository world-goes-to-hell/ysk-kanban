import { apiFetch } from './client';

const projectAPI = {
  list:   () => apiFetch('/api/projects'),
  tree:   () => apiFetch('/api/projects/tree'),
  create: (data) => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
  toggleFavorite: (id) => apiFetch(`/api/projects/${id}/favorite`, { method: 'POST' }),
  getFavorites: () => apiFetch('/api/projects/favorites'),
  getMembers:       (id) => apiFetch(`/api/projects/${id}/members`),
  addMember:        (id, userId, role) => apiFetch(`/api/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) }),
  updateMemberRole: (id, userId, role) => apiFetch(`/api/projects/${id}/members/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeMember:     (id, userId) => apiFetch(`/api/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  getUsers:         () => apiFetch('/api/users'),
};

export default projectAPI;
