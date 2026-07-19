const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export interface PublicTreatment {
  id: string;
  name: string;
  category: string;
  description: string | null;
  durationMinutes: number;
  numberOfSessions: number;
}

// Server-side fetch used by the Services page. Revalidates periodically so
// changes made in the admin panel's Treatment catalog show up here without a
// redeploy, without hitting the backend on every single request.
export async function fetchPublicTreatments(): Promise<PublicTreatment[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/treatments/public-list`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data: PublicTreatment[] };
    return body.data;
  } catch {
    // Backend unreachable at build/request time — the page falls back to an
    // empty state rather than failing the whole page render.
    return [];
  }
}

export interface EnquiryInput {
  fullName: string;
  mobileNumber: string;
  email?: string;
  notes?: string;
}

export interface EnquiryResult {
  ok: boolean;
  message: string;
}

// Client-side submit for the Contact/Book Appointment form — hits the
// backend's public, rate-limited lead-capture endpoint directly.
export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/leads/public-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => null)) as { data?: { message?: string }; error?: { message?: string } } | null;
    if (!res.ok) {
      return {
        ok: false,
        message: body?.error?.message ?? 'Something went wrong. Please call us instead.',
      };
    }
    return { ok: true, message: body?.data?.message ?? 'Thank you, our team will contact you shortly.' };
  } catch {
    return { ok: false, message: 'Could not reach the server. Please call us instead.' };
  }
}
