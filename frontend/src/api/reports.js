import { apiFetch } from './client';

const reportsAPI = {
  daily: (date) => apiFetch(`/api/reports/daily${date ? `?date=${date}` : ''}`),
};

export default reportsAPI;
