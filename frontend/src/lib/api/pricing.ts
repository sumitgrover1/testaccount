import { apiClient } from './client';
import type { ApiEnvelope, Paginated, PricingApprovalStatus, PricingApprovalRequest } from '@/types';

export async function getEffectivePrice(patientId: string, treatmentId: string) {
  const res = await apiClient.get<ApiEnvelope<{ price: number; source: 'PATIENT_OVERRIDE' | 'TREATMENT_DEFAULT' }>>(
    '/pricing/effective-price',
    { params: { patientId, treatmentId } },
  );
  return res.data.data;
}

export async function setPatientTreatmentPrice(input: {
  patientId: string;
  treatmentId: string;
  price: number;
  reason?: string;
}) {
  const res = await apiClient.post<
    ApiEnvelope<{ applied: boolean; request?: PricingApprovalRequest; price?: unknown }>
  >('/pricing/patient-treatment-price', input);
  return res.data.data;
}

export async function getPatientTreatmentPriceHistory(patientId: string, treatmentId: string) {
  const res = await apiClient.get<
    ApiEnvelope<{ oldPrice: string | null; newPrice: string; changedAt: string; reason: string | null }[]>
  >('/pricing/patient-treatment-price/history', { params: { patientId, treatmentId } });
  return res.data.data;
}

export async function listPricingRequests(params: {
  page?: number;
  limit?: number;
  status?: PricingApprovalStatus;
  patientId?: string;
}) {
  const res = await apiClient.get<Paginated<PricingApprovalRequest>>('/pricing/requests', { params });
  return res.data;
}

export async function reviewPricingRequest(id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
  const res = await apiClient.post<ApiEnvelope<PricingApprovalRequest>>(`/pricing/requests/${id}/review`, {
    decision,
    reason,
  });
  return res.data.data;
}
