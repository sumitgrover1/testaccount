import { env } from '../../config/env';
import { logger } from '../../config/logger';

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

interface PlaceDetailsResponse {
  status: string;
  error_message?: string;
  result?: {
    rating?: number;
    user_ratings_total?: number;
    reviews?: {
      author_name: string;
      profile_photo_url?: string;
      rating: number;
      relative_time_description: string;
      text: string;
      time: number;
    }[];
  };
}

// Google charges per Place Details call and caps request volume — cache the
// result in memory rather than calling out on every website page load.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: { fetchedAt: number; data: GoogleReviewsResult } | null = null;

export async function getGoogleReviews(): Promise<GoogleReviewsResult> {
  if (!env.GOOGLE_PLACES_API_KEY || !env.GOOGLE_PLACE_ID) {
    return { configured: false, reviews: [] };
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', env.GOOGLE_PLACE_ID);
  url.searchParams.set('fields', 'rating,user_ratings_total,reviews');
  url.searchParams.set('key', env.GOOGLE_PLACES_API_KEY);

  const res = await fetch(url.toString());
  const body = (await res.json()) as PlaceDetailsResponse;

  if (body.status !== 'OK' || !body.result) {
    logger.warn(
      { status: body.status, errorMessage: body.error_message },
      'Google Places API did not return place details',
    );
    // Serve stale cache rather than an empty result if a previous fetch succeeded.
    return cache?.data ?? { configured: true, reviews: [] };
  }

  const data: GoogleReviewsResult = {
    configured: true,
    rating: body.result.rating,
    totalReviews: body.result.user_ratings_total,
    reviews: (body.result.reviews ?? []).map((r) => ({
      authorName: r.author_name,
      authorPhotoUrl: r.profile_photo_url,
      rating: r.rating,
      relativeTimeDescription: r.relative_time_description,
      text: r.text,
      time: r.time,
    })),
  };

  cache = { fetchedAt: Date.now(), data };
  return data;
}
