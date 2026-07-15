import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens and underscores'),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().nonnegative().max(10_000_000).optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    maxUses: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Boolean(data.discountPercent) !== Boolean(data.discountAmount), {
    message: 'Provide either discountPercent or discountAmount, not both',
    path: ['discountPercent'],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z
  .object({
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    maxUses: z.coerce.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export const listCouponsQuerySchema = paginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
});
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
