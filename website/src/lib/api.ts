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

export interface GoogleReview {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}

export interface GoogleReviewsResult {
  configured: boolean;
  rating?: number;
  totalReviews?: number;
  reviews: GoogleReview[];
}

// Server-side fetch for the Testimonials page — real reviews from the
// clinic's Google Business Profile, proxied through our backend so the
// Google API key never reaches the browser. Returns `configured: false`
// until GOOGLE_PLACES_API_KEY/GOOGLE_PLACE_ID are set on the backend.
export async function fetchGoogleReviews(): Promise<GoogleReviewsResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/google`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { configured: false, reviews: [] };
    const body = (await res.json()) as { data: GoogleReviewsResult };
    return body.data;
  } catch {
    return { configured: false, reviews: [] };
  }
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaType: string;
  imageUrl: string;
  videoUrl?: string;
  permalink: string;
  timestamp: string;
}

export interface InstagramGalleryResult {
  configured: boolean;
  posts: InstagramPost[];
}

// Server-side fetch for the Gallery page — real posts from the clinic's
// Instagram, proxied through our backend so the access token never reaches
// the browser. Returns `configured: false` until INSTAGRAM_ACCESS_TOKEN is
// set on the backend.
export async function fetchInstagramGallery(): Promise<InstagramGalleryResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/gallery/instagram`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { configured: false, posts: [] };
    const body = (await res.json()) as { data: InstagramGalleryResult };
    return body.data;
  } catch {
    return { configured: false, posts: [] };
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
