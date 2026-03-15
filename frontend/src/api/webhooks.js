import { apiFetch } from './client';

export const webhookAPI = {
  list: (projectId) => apiFetch(`/api/projects/${projectId}/webhooks`),
  create: (projectId, data) => apiFetch(`/api/projects/${projectId}/webhooks`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (projectId, webhookId, data) => apiFetch(`/api/projects/${projectId}/webhooks/${webhookId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  remove: (projectId, webhookId) => apiFetch(`/api/projects/${projectId}/webhooks/${webhookId}`, {
    method: 'DELETE',
  }),
};
