import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createTreatmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(4000).optional(),
  defaultPrice: z.coerce.number().nonnegative().max(10_000_000),
  durationMinutes: z.coerce.number().int().positive().max(600),
  numberOfSessions: z.coerce.number().int().positive().max(365).default(1),
});
export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;

export const updateTreatmentSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(4000).optional(),
    defaultPrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
    durationMinutes: z.coerce.number().int().positive().max(600).optional(),
    numberOfSessions: z.coerce.number().int().positive().max(365).optional(),
    isActive: z.boolean().optional(),
    // Present only when defaultPrice changes, so the price-history entry can
    // record why — never required, but encouraged for audit clarity.
    priceChangeReason: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentSchema>;

export const listTreatmentsQuerySchema = paginationSchema.extend({
  category: z.string().trim().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListTreatmentsQuery = z.infer<typeof listTreatmentsQuerySchema>;
