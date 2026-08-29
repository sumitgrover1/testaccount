import type { VehicleType } from './types';

// Server components talk to the API directly (API_URL, often an internal host);
// the browser uses the public URL. Falling back keeps a single-host dev setup
// working without setting both.
const SERVER_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const CLIENT_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  error?: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

interface FetchOptions extends RequestInit {
  // Seconds to cache the response for. Catalogue pages change rarely, so they
  // are revalidated on a timer rather than fetched on every request.
  revalidate?: number;
}

async function request<T>(path: string, options: FetchOptions = {}, base = SERVER_BASE): Promise<T> {
  const { revalidate, ...init } = options;

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...(revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } }),
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error?.code,
    );
  }

  return payload.data;
}

// Same as request(), but keeps the pagination envelope for listing pages.
async function requestWithMeta<T>(path: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const { revalidate, ...init } = options;
  const response = await fetch(`${SERVER_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...(revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } }),
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error?.code,
    );
  }
  return payload;
}

export const api = { request, requestWithMeta };

// Browser-side call used by the interactive forms (lead capture, EMI, quotes).
export async function clientPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) }, CLIENT_BASE);
}

export async function clientGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' }, CLIENT_BASE);
}

// URL segment ↔ enum. The site uses reader-friendly paths (/new-cars) while the
// API speaks the enum (CAR).
export const VEHICLE_SEGMENTS: Record<string, VehicleType> = {
  'new-cars': 'CAR',
  bikes: 'BIKE',
  buses: 'BUS',
  tractors: 'TRACTOR',
};

export const SEGMENT_FOR_TYPE: Record<VehicleType, string> = {
  CAR: 'new-cars',
  BIKE: 'bikes',
  BUS: 'buses',
  TRACTOR: 'tractors',
};

export const VEHICLE_LABELS: Record<VehicleType, { singular: string; plural: string; tagline: string }> = {
  CAR: { singular: 'Car', plural: 'New Cars', tagline: 'Hatchbacks, sedans, SUVs and MPVs' },
  BIKE: { singular: 'Bike', plural: 'Bikes & Scooters', tagline: 'Commuters, sports bikes, scooters and EVs' },
  BUS: { singular: 'Bus', plural: 'Buses', tagline: 'School, staff and intercity passenger vehicles' },
  TRACTOR: { singular: 'Tractor', plural: 'Tractors', tagline: '2WD and 4WD tractors for every farm size' },
};
