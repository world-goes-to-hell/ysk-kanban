import { apiFetch } from './client';

export async function fetchUsers() {
  return apiFetch('/api/auth/users');
}
