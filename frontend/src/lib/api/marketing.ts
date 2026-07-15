import { apiClient } from './client';
import type { ApiEnvelope, Campaign, LeadSource, Paginated } from '@/types';

export interface CampaignInput {
  name: string;
  source: LeadSource;
  adSet?: string;
  ad?: string;
  keyword?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  costPerLead?: number;
  totalSpend?: number;
  startDate?: string;
  endDate?: string;
}

export async function createCampaign(input: CampaignInput) {
  const res = await apiClient.post<ApiEnvelope<Campaign>>('/marketing/campaigns', input);
  return res.data.data;
}

export async function listCampaigns(params: { page?: number; limit?: number; source?: LeadSource; isActive?: boolean; search?: string }) {
  const res = await apiClient.get<Paginated<Campaign>>('/marketing/campaigns', { params });
  return res.data;
}

export async function updateCampaign(id: string, input: Partial<CampaignInput> & { isActive?: boolean }) {
  const res = await apiClient.patch<ApiEnvelope<Campaign>>(`/marketing/campaigns/${id}`, input);
  return res.data.data;
}

export async function getCampaignPerformance(id: string) {
  const res = await apiClient.get<
    ApiEnvelope<{
      totalLeads: number;
      convertedLeads: number;
      conversionRate: number;
      totalSpend: number;
      costPerConversion: number | null;
    }>
  >(`/marketing/campaigns/${id}/performance`);
  return res.data.data;
}
