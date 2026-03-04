import { apiFetch } from './client';

const projectAPI = {
  list:   () => apiFetch('/api/projects'),
  tree:   () => apiFetch('/api/projects/tree'),
  create: (data) => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
  toggleFavorite: (id) => apiFetch(`/api/projects/${id}/favorite`, { method: 'POST' }),
  getFavorites: () => apiFetch('/api/projects/favorites'),
};

export default projectAPI;
