import { apiClient } from './client';
import type { ApiEnvelope, Lead, LeadSource, LeadStatus, Paginated, Patient } from '@/types';

export interface LeadInput {
  fullName: string;
  mobileNumber: string;
  email?: string;
  interestedTreatmentId?: string;
  source: LeadSource;
  campaignId?: string;
  assignedCounselorId?: string;
  notes?: string;
}

export async function createLead(input: LeadInput) {
  const res = await apiClient.post<ApiEnvelope<Lead>>('/leads', input);
  return res.data.data;
}

export async function listLeads(params: {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  source?: LeadSource;
  assignedCounselorId?: string;
  search?: string;
}) {
  const res = await apiClient.get<Paginated<Lead>>('/leads', { params });
  return res.data;
}

export async function getLead(id: string) {
  const res = await apiClient.get<ApiEnvelope<Lead>>(`/leads/${id}`);
  return res.data.data;
}

export async function updateLead(id: string, input: Partial<LeadInput> & { nextFollowUpAt?: string; leadScore?: number }) {
  const res = await apiClient.patch<ApiEnvelope<Lead>>(`/leads/${id}`, input);
  return res.data.data;
}

export async function changeLeadStatus(id: string, status: LeadStatus, notes?: string) {
  const res = await apiClient.post<ApiEnvelope<Lead>>(`/leads/${id}/status`, { status, notes });
  return res.data.data;
}

export interface ConvertLeadInput {
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  age?: number;
  city: string;
  state: string;
}

export async function convertLead(id: string, input: ConvertLeadInput) {
  const res = await apiClient.post<ApiEnvelope<{ lead: Lead; patient: Patient }>>(`/leads/${id}/convert`, input);
  return res.data.data;
}
