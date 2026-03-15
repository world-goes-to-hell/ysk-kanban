import { apiFetch } from './client';

export async function fetchActivityLogs(todoId) {
  return apiFetch(`/api/activity-logs/todo/${todoId}`);
}

export async function fetchProjectActivityLogs(projectId, limit = 50) {
  return apiFetch(`/api/activity-logs/project/${projectId}?limit=${limit}`);
}
