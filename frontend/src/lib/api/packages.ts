import { apiClient } from './client';
import type { ApiEnvelope, Paginated, PackageTreatmentItem, TreatmentPackage } from '@/types';

export interface PackageInput {
  name: string;
  description?: string;
  defaultPrice: number;
  discountPercent?: number;
  validityDays?: number;
  items: { treatmentId: string; quantity: number }[];
}

export async function createPackage(input: PackageInput) {
  const res = await apiClient.post<ApiEnvelope<TreatmentPackage>>('/packages', input);
  return res.data.data;
}

export async function listPackages(params: { page?: number; limit?: number; isActive?: boolean; search?: string }) {
  const res = await apiClient.get<Paginated<TreatmentPackage>>('/packages', { params });
  return res.data;
}

export async function getPackage(id: string) {
  const res = await apiClient.get<ApiEnvelope<TreatmentPackage>>(`/packages/${id}`);
  return res.data.data;
}

export async function updatePackage(
  id: string,
  input: Partial<Omit<PackageInput, 'items'>> & { isActive?: boolean; priceChangeReason?: string },
) {
  const res = await apiClient.patch<ApiEnvelope<TreatmentPackage>>(`/packages/${id}`, input);
  return res.data.data;
}

export async function addPackageItem(packageId: string, input: { treatmentId: string; quantity: number }) {
  const res = await apiClient.post<ApiEnvelope<PackageTreatmentItem>>(`/packages/${packageId}/items`, input);
  return res.data.data;
}

export async function removePackageItem(packageId: string, itemId: string) {
  await apiClient.delete(`/packages/${packageId}/items/${itemId}`);
}
