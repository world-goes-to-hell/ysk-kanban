import { apiFetch } from './client';

export async function fetchCalendarTodos(startDate, endDate, projectId) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (projectId) params.append('projectId', projectId);
  return apiFetch(`/api/todos/report?${params.toString()}`);
}
