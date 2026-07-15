import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const itemIdParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
  itemId: z.string().uuid('Invalid itemId'),
});
export type ItemIdParam = z.infer<typeof itemIdParamSchema>;

const packageItemSchema = z.object({
  treatmentId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(365).default(1),
});

export const createPackageSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  defaultPrice: z.coerce.number().nonnegative().max(10_000_000),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  validityDays: z.coerce.number().int().positive().max(3650).optional(),
  items: z.array(packageItemSchema).min(1, 'A package must include at least one treatment'),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    defaultPrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    validityDays: z.coerce.number().int().positive().max(3650).optional(),
    isActive: z.boolean().optional(),
    priceChangeReason: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const addPackageItemSchema = packageItemSchema;
export type AddPackageItemInput = z.infer<typeof addPackageItemSchema>;

export const updatePackageItemSchema = z.object({
  quantity: z.coerce.number().int().positive().max(365),
});
export type UpdatePackageItemInput = z.infer<typeof updatePackageItemSchema>;

export const listPackagesQuerySchema = paginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListPackagesQuery = z.infer<typeof listPackagesQuerySchema>;
