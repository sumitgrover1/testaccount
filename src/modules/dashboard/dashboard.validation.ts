import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

export const topTreatmentsQuerySchema = dateRangeQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type TopTreatmentsQuery = z.infer<typeof topTreatmentsQuerySchema>;
