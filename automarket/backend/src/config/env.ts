import 'dotenv/config';
import { z } from 'zod';

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default(''),
  TRUST_PROXY: boolFromString,

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ISSUER: z.string().default('automarket-api'),
  JWT_AUDIENCE: z.string().default('automarket-admin'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LEAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  LEAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(15),

  INSURANCE_GST_PERCENT: z.coerce.number().min(0).max(100).default(18),
  DEFAULT_LOAN_INTEREST_RATE: z.coerce.number().positive().default(9.5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: a misconfigured secret or missing database URL must never boot
  // into a half-working service that only breaks on the first request.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
