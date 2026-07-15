import { apiClient } from './client';
import type { ApiEnvelope } from '@/types';

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export async function getLeadsSummary(params: DateRangeParams) {
  const res = await apiClient.get<
    ApiEnvelope<{
      dailyLeads: number;
      totalLeads: number;
      convertedLeads: number;
      conversionRatePercent: number;
      bySource: { source: string; count: number }[];
    }>
  >('/dashboard/leads', { params });
  return res.data.data;
}

export async function getRevenueSummary(params: DateRangeParams) {
  const res = await apiClient.get<
    ApiEnvelope<{
      totalRevenue: number;
      treatmentRevenue: number;
      packageRevenue: number;
      revenueByDoctor: { doctorId: string; name: string; revenue: number }[];
    }>
  >('/dashboard/revenue', { params });
  return res.data.data;
}

export async function getAppointmentStats(params: DateRangeParams) {
  const res = await apiClient.get<
    ApiEnvelope<{
      total: number;
      byStatus: { status: string; count: number }[];
      noShowCount: number;
      noShowRatePercent: number;
    }>
  >('/dashboard/appointments', { params });
  return res.data.data;
}

export async function getInventoryOverview() {
  const res = await apiClient.get<
    ApiEnvelope<{ totalValueAtCost: number; lowStockAlerts: { id: string; name: string; totalStock: number; minimumStock: number }[] }>
  >('/dashboard/inventory');
  return res.data.data;
}

export async function getTopTreatments(params: DateRangeParams & { limit?: number }) {
  const res = await apiClient.get<
    ApiEnvelope<{ treatmentId: string; name: string; revenue: number; count: number }[]>
  >('/dashboard/top-treatments', { params });
  return res.data.data;
}

export async function getCounselorPerformance(params: DateRangeParams) {
  const res = await apiClient.get<
    ApiEnvelope<{ counselorId: string; name: string; totalLeads: number; convertedLeads: number; conversionRatePercent: number }[]>
  >('/dashboard/counselor-performance', { params });
  return res.data.data;
}

export async function getCampaignPerformance(params: DateRangeParams) {
  const res = await apiClient.get<
    ApiEnvelope<
      {
        campaignId: string;
        name: string;
        totalLeads: number;
        convertedLeads: number;
        conversionRatePercent: number;
        spend: number;
        revenue: number;
        roiPercent: number | null;
      }[]
    >
  >('/dashboard/campaign-performance', { params });
  return res.data.data;
}
