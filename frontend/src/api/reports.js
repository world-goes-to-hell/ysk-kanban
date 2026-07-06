import { apiFetch } from './client';

const reportsAPI = {
  daily: (date) => apiFetch(`/api/reports/daily${date ? `?date=${date}` : ''}`),
  aiFormat: (workText, date) =>
    apiFetch('/api/reports/ai-format', {
      method: 'POST',
      body: JSON.stringify({ workText, date }),
    }),
};

export default reportsAPI;
