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

// Downloads an .xlsx of every lead matching the given filters (no
// pagination — this is meant to match whatever the Leads page is currently
// filtered to, e.g. source=INSTAGRAM for WhatsApp leads coming in from
// Facebook/Instagram ads) and triggers a browser save-as.
export async function exportLeads(params: {
  status?: LeadStatus;
  source?: LeadSource;
  assignedCounselorId?: string;
  search?: string;
}) {
  const res = await apiClient.get<Blob>('/leads/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leads-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  pincode?: string;
}

export async function convertLead(id: string, input: ConvertLeadInput) {
  const res = await apiClient.post<ApiEnvelope<{ lead: Lead; patient: Patient }>>(`/leads/${id}/convert`, input);
  return res.data.data;
}
