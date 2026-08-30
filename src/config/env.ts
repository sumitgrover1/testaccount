import 'dotenv/config';
import { z } from 'zod';

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default(''),
  TRUST_PROXY: boolFromString,

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ISSUER: z.string().default('clinic-backend'),
  JWT_AUDIENCE: z.string().default('clinic-clients'),

  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  // Set this (e.g. ".yourdomain.com") when the admin panel and website live
  // on different subdomains than the API — without it, auth cookies are
  // host-only (scoped to the API's exact hostname), so JS running on a
  // sibling subdomain can never read the CSRF cookie, breaking every
  // refresh/logout/mutating request. Leave unset for same-host deployments
  // (e.g. local dev, where everything is on localhost).
  COOKIE_DOMAIN: z.string().optional(),

  ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // Counselors/receptionists may discount a patient-specific treatment price by
  // up to this percent below the treatment's default price without approval;
  // beyond it, a PricingApprovalRequest is created instead (see pricing.service.ts).
  PRICING_MAX_UNAPPROVED_DISCOUNT_PERCENT: z.coerce.number().min(0).max(100).default(15),

  // Shared secrets for verifying inbound ad-platform lead webhooks (see
  // marketing.routes.ts). Optional — a webhook without its secret configured
  // is rejected at request time rather than at boot, since these are
  // per-integration credentials, not core app config.
  MARKETING_WEBHOOK_SECRET_FACEBOOK: z.string().optional(),
  MARKETING_WEBHOOK_SECRET_GOOGLE: z.string().optional(),

  // Google Business Profile reviews, surfaced on the public website's
  // Testimonials page (see reviews.service.ts). Optional — the endpoint
  // returns an empty/not-configured response until both are set, rather
  // than failing at boot, since this is an optional integration.
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_PLACE_ID: z.string().optional(),

  // Instagram Graph API, for the website's live Gallery feed (see
  // instagram.service.ts). Optional — a long-lived token generated via a
  // Meta Developer App connected to the clinic's Instagram professional
  // account. Long-lived tokens last 60 days; the service auto-refreshes
  // and persists the refreshed token to disk (see TOKEN_CACHE_FILE) so this
  // .env value only needs to be the *initial* token, not kept up to date
  // forever — though it must still be replaced if the server has been down
  // long enough for the cached refresh to lapse past 60 days.
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Fail fast: an enterprise service must never boot with a misconfigured or
    // insecure environment (e.g. missing/weak secrets).
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  if (parsed.data.NODE_ENV === 'production') {
    const insecureDefaults = ['replace-with', 'changeme', 'secret'];
    const secrets = [
      parsed.data.JWT_ACCESS_SECRET,
      parsed.data.JWT_REFRESH_SECRET,
      parsed.data.COOKIE_SECRET,
    ];
    const hasInsecureDefault = secrets.some((secret) =>
      insecureDefaults.some((bad) => secret.toLowerCase().includes(bad)),
    );
    if (hasInsecureDefault) {
      // eslint-disable-next-line no-console
      console.error('Refusing to start in production with placeholder/default secrets.');
      process.exit(1);
    }
  }

  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export type Env = typeof env;
