import { apiClient } from './client';
import type { ApiEnvelope, FollowUp, FollowUpChannel, FollowUpStatus, Paginated } from '@/types';

export async function createFollowUp(input: {
  leadId?: string;
  patientId?: string;
  assignedToId: string;
  channel: FollowUpChannel;
  dueAt: string;
  notes?: string;
}) {
  const res = await apiClient.post<ApiEnvelope<FollowUp>>('/followups', input);
  return res.data.data;
}

export async function listFollowUps(params: {
  page?: number;
  limit?: number;
  status?: FollowUpStatus;
  assignedToId?: string;
  overdue?: boolean;
}) {
  const res = await apiClient.get<Paginated<FollowUp>>('/followups', { params });
  return res.data;
}

export async function completeFollowUp(id: string, notes?: string) {
  const res = await apiClient.post<ApiEnvelope<FollowUp>>(`/followups/${id}/complete`, { notes });
  return res.data.data;
}

export async function escalateFollowUp(id: string, escalatedToId: string, notes?: string) {
  const res = await apiClient.post<ApiEnvelope<FollowUp>>(`/followups/${id}/escalate`, { escalatedToId, notes });
  return res.data.data;
}

export async function sendReminder(id: string) {
  const res = await apiClient.post(`/followups/${id}/send-reminder`);
  return res.data.data;
}
