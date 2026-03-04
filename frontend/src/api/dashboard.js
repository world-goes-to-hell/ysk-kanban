import { apiFetch } from './client';

const dashboardAPI = {
  get: () => apiFetch('/api/dashboard'),
};

export default dashboardAPI;
