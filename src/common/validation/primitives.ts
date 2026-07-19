import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../utils/password';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

// Length-based policy per NIST 800-63B; upper bound prevents hashing-DoS from
// pathologically long inputs.
export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(128);

export const personNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[\p{L} .'-]+$/u, 'Name contains invalid characters');

export const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Invalid mobile number');

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});
export type UuidParam = z.infer<typeof uuidParamSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
