import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaType: string;
  // Always a displayable static image — the photo itself, or a video's poster
  // frame (thumbnail_url) for VIDEO/REELS posts.
  imageUrl: string;
  // Only set for VIDEO/REELS posts — the actual playable video file.
  videoUrl?: string;
  permalink: string;
  timestamp: string;
}

export interface InstagramGalleryResult {
  configured: boolean;
  posts: InstagramPost[];
}

interface TokenCacheFile {
  accessToken: string;
  refreshedAt: number;
}

// Long-lived Instagram tokens last 60 days and must be refreshed before
// then. Rather than requiring a human to regenerate and redeploy a new
// .env value every two months, the refreshed token is persisted here so it
// survives process restarts; INSTAGRAM_ACCESS_TOKEN in .env only needs to
// be the *initial* token. Gitignored — this is a runtime secret, not source.
const TOKEN_CACHE_FILE = path.join(process.cwd(), '.instagram-token-cache.json');
// Meta rejects a refresh attempt on a token less than 24h old.
const TOKEN_MIN_REFRESH_AGE_MS = 24 * 60 * 60 * 1000;
// Places API-style cost/rate-limit hygiene — don't hit Instagram on every page load.
const MEDIA_CACHE_TTL_MS = 60 * 60 * 1000;

let mediaCache: { fetchedAt: number; data: InstagramGalleryResult } | null = null;

function loadTokenCache(): TokenCacheFile | null {
  try {
    if (!fs.existsSync(TOKEN_CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')) as TokenCacheFile;
  } catch {
    return null;
  }
}

function saveTokenCache(accessToken: string): void {
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ accessToken, refreshedAt: Date.now() }));
  } catch (err) {
    logger.warn({ err }, 'Could not persist refreshed Instagram token to disk');
  }
}

function getCurrentToken(): { token: string; refreshedAt: number } | null {
  const cached = loadTokenCache();
  if (cached) return { token: cached.accessToken, refreshedAt: cached.refreshedAt };
  if (env.INSTAGRAM_ACCESS_TOKEN) return { token: env.INSTAGRAM_ACCESS_TOKEN, refreshedAt: 0 };
  return null;
}

async function refreshTokenIfDue(token: string, refreshedAt: number): Promise<string> {
  if (refreshedAt !== 0 && Date.now() - refreshedAt < TOKEN_MIN_REFRESH_AGE_MS) {
    return token;
  }

  try {
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', token);

    const res = await fetch(url.toString());
    const body = (await res.json()) as { access_token?: string; error?: unknown };

    if (body.access_token) {
      saveTokenCache(body.access_token);
      return body.access_token;
    }
    logger.warn({ body }, 'Instagram token refresh did not return a new token');
    return token;
  } catch (err) {
    logger.warn({ err }, 'Instagram token refresh request failed');
    return token;
  }
}

export async function getInstagramGallery(): Promise<InstagramGalleryResult> {
  const current = getCurrentToken();
  if (!current) {
    return { configured: false, posts: [] };
  }

  if (mediaCache && Date.now() - mediaCache.fetchedAt < MEDIA_CACHE_TTL_MS) {
    return mediaCache.data;
  }

  const token = await refreshTokenIfDue(current.token, current.refreshedAt);

  const url = new URL('https://graph.instagram.com/me/media');
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
  );
  url.searchParams.set('limit', '12');
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString());
  const body = (await res.json()) as {
    data?: {
      id: string;
      caption?: string;
      media_type: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink: string;
      timestamp: string;
    }[];
    error?: { message?: string; type?: string; code?: number };
  };

  if (!body.data) {
    logger.warn({ error: body.error }, 'Instagram Graph API did not return media');
    // Serve stale cache rather than an empty result if a previous fetch succeeded.
    return mediaCache?.data ?? { configured: true, posts: [] };
  }

  const data: InstagramGalleryResult = {
    configured: true,
    posts: body.data
      .map((m) => ({
        id: m.id,
        caption: m.caption,
        mediaType: m.media_type,
        // Videos don't expose a directly displayable image via media_url —
        // that field is the video file itself, so the poster frame comes
        // from thumbnail_url instead; image/carousel posts use media_url.
        imageUrl: (m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url) ?? '',
        videoUrl: m.media_type === 'VIDEO' ? m.media_url : undefined,
        permalink: m.permalink,
        timestamp: m.timestamp,
      }))
      .filter((p) => p.imageUrl),
  };

  mediaCache = { fetchedAt: Date.now(), data };
  return data;
}
