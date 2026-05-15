import { apiFetch } from './client';

const statusAPI = {
  list: (projectId) => apiFetch(`/api/projects/${projectId}/statuses`),
  create: (projectId, data) => apiFetch(`/api/projects/${projectId}/statuses`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (projectId, statusKey, data) => apiFetch(`/api/projects/${projectId}/statuses/${statusKey}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  remove: (projectId, statusKey) => apiFetch(`/api/projects/${projectId}/statuses/${statusKey}`, {
    method: 'DELETE',
  }),
  reorder: (projectId, orderedKeys) => apiFetch(`/api/projects/${projectId}/statuses/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ orderedKeys }),
  }),
};

export default statusAPI;
