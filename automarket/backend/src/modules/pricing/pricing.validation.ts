import { z } from 'zod';
import { contactSchema } from '../leads/lead.validation';

export const onRoadTeaserQuerySchema = z.object({
  variantId: z.string().uuid(),
  citySlug: z.string().trim().min(1).max(80),
});

// The on-road breakup is released in exchange for contact details, so the
// customer form is part of the request that computes it.
export const onRoadQuoteSchema = z.object({
  variantId: z.string().uuid(),
  citySlug: z.string().trim().min(1).max(80),
  contact: contactSchema,
});

export const quoteIdParamSchema = z.object({ id: z.string().uuid() });
