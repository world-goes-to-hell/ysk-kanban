import { apiFetch } from './client';

const apiKeyAPI = {
  list:   (projectId) => apiFetch(`/api/projects/${projectId}/api-keys`),
  create: (projectId, data) => apiFetch(`/api/projects/${projectId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  revoke: (projectId, keyId) => apiFetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
    method: 'DELETE',
  }),
};

export default apiKeyAPI;
