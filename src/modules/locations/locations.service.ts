import { logger } from '../../config/logger';

export interface PincodeLookupResult {
  valid: boolean;
  city?: string;
  district?: string;
  state?: string;
}

interface PostOffice {
  Name: string;
  District: string;
  State: string;
}

interface PincodeApiResponse {
  Status: string;
  PostOffice: PostOffice[] | null;
}

// India Post's public directory — free, no API key, authoritative source for
// pincode -> city/state, so patient intake never has to rely on a bundled
// (and inevitably stale/incomplete) dataset or free-text entry that drifts
// out of sync ("Gurugram" vs "gurgaon" vs "Gurgaon,").
const PINCODE_API_BASE = 'https://api.postalpincode.in/pincode';

// Pincode-to-locality mappings are effectively static — cache aggressively to
// avoid hitting the free public API on every keystroke across the clinic.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { fetchedAt: number; data: PincodeLookupResult }>();

export async function lookupPincode(pincode: string): Promise<PincodeLookupResult> {
  const cached = cache.get(pincode);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  let result: PincodeLookupResult;
  try {
    const res = await fetch(`${PINCODE_API_BASE}/${pincode}`);
    const body = (await res.json()) as PincodeApiResponse[];
    const [entry] = body;
    const office = entry?.PostOffice?.[0];

    result =
      entry?.Status === 'Success' && office
        ? { valid: true, city: office.District, district: office.District, state: office.State }
        : { valid: false };
  } catch (err) {
    logger.warn({ err, pincode }, 'Pincode lookup failed');
    result = { valid: false };
  }

  cache.set(pincode, { fetchedAt: Date.now(), data: result });
  return result;
}
