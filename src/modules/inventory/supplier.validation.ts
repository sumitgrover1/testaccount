import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  address: z.string().trim().max(500).optional(),
  gstNumber: z.string().trim().max(20).optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    contactPerson: z.string().trim().max(150).optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    address: z.string().trim().max(500).optional(),
    gstNumber: z.string().trim().max(20).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const listSuppliersQuerySchema = paginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
