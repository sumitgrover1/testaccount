import { apiClient } from './client';
import type { ApiEnvelope, Paginated, Treatment } from '@/types';

export interface TreatmentInput {
  name: string;
  category: string;
  description?: string;
  defaultPrice: number;
  durationMinutes: number;
  numberOfSessions: number;
}

export async function createTreatment(input: TreatmentInput) {
  const res = await apiClient.post<ApiEnvelope<Treatment>>('/treatments', input);
  return res.data.data;
}

export async function listTreatments(params: {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}) {
  const res = await apiClient.get<Paginated<Treatment>>('/treatments', { params });
  return res.data;
}

export async function getTreatment(id: string) {
  const res = await apiClient.get<ApiEnvelope<Treatment>>(`/treatments/${id}`);
  return res.data.data;
}

export async function updateTreatment(
  id: string,
  input: Partial<TreatmentInput> & { isActive?: boolean; priceChangeReason?: string },
) {
  const res = await apiClient.patch<ApiEnvelope<Treatment>>(`/treatments/${id}`, input);
  return res.data.data;
}

export async function getTreatmentPriceHistory(id: string) {
  const res = await apiClient.get<
    ApiEnvelope<{ oldPrice: string | null; newPrice: string; changedAt: string; reason: string | null }[]>
  >(`/treatments/${id}/price-history`);
  return res.data.data;
}
