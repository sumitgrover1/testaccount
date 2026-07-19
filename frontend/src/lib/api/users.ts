import { apiClient } from './client';
import type { ApiEnvelope, Paginated, Role, User } from '@/types';

export async function getMe() {
  const res = await apiClient.get<ApiEnvelope<User>>('/users/me');
  return res.data.data;
}

export async function updateMe(input: { firstName?: string; lastName?: string }) {
  const res = await apiClient.patch<ApiEnvelope<User>>('/users/me', input);
  return res.data.data;
}

export async function createStaffUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}) {
  const res = await apiClient.post<ApiEnvelope<User>>('/users', input);
  return res.data.data;
}

export async function listUsers(params: { page?: number; limit?: number; role?: Role; search?: string }) {
  const res = await apiClient.get<Paginated<User>>('/users', { params });
  return res.data;
}

export async function updateUserAsAdmin(id: string, input: { role?: Role; isActive?: boolean }) {
  const res = await apiClient.patch<ApiEnvelope<User>>(`/users/${id}`, input);
  return res.data.data;
}
