import { apiClient } from './client';
import { getCookie } from '../auth/tokenStore';
import type { ApiEnvelope } from '@/types';

export async function login(email: string, password: string) {
  const res = await apiClient.post<ApiEnvelope<{ accessToken: string; userId: string }>>('/auth/login', {
    email,
    password,
  });
  return res.data.data;
}

export async function logout() {
  const csrfToken = getCookie('csrf_token');
  await apiClient.post('/auth/logout', {}, { headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {} });
}

export async function forgotPassword(email: string) {
  const res = await apiClient.post<ApiEnvelope<{ message: string }>>('/auth/forgot-password', { email });
  return res.data.data;
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await apiClient.post<ApiEnvelope<{ message: string }>>('/auth/reset-password', {
    token,
    newPassword,
  });
  return res.data.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await apiClient.post<ApiEnvelope<{ message: string }>>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return res.data.data;
}
