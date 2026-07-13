import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { env } from '../config/env';

// When Redis is configured, rate limits are enforced across all app instances
// (required once the service scales horizontally). Otherwise falls back to the
// default in-memory store, which is process-local only.
function buildStore(prefix: string): Partial<Options> {
  if (!redisClient) return {};
  return {
    store: new RedisStore({
      // @ts-expect-error -- ioredis client is compatible with the call signature rate-limit-redis expects
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: `rl:${prefix}:`,
    }),
  };
}

// General API rate limit — generous, mainly a backstop against runaway clients.
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, slow down.' } },
  ...buildStore('general'),
});

// Tighter limit for authentication endpoints (login, register, password reset)
// to blunt credential-stuffing and brute-force attacks. Keyed by IP; combined
// with per-account lockout (see auth.service.ts) for defense in depth.
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later.' },
  },
  ...buildStore('auth'),
});
