import { z } from 'zod';

export const listCitiesQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  popular: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const citySlugParamSchema = z.object({ slug: z.string().min(1).max(80) });
