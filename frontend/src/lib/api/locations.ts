import { apiClient } from './client';
import type { ApiEnvelope } from '@/types';

export interface PincodeLookupResult {
  valid: boolean;
  city?: string;
  district?: string;
  state?: string;
}

export async function lookupPincode(pincode: string) {
  const res = await apiClient.get<ApiEnvelope<PincodeLookupResult>>(`/locations/pincode/${pincode}`);
  return res.data.data;
}
