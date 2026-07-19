import { StockMovementType } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const batchIdParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
  batchId: z.string().uuid('Invalid batchId'),
});
export type BatchIdParam = z.infer<typeof batchIdParamSchema>;

export const ruleIdParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
  ruleId: z.string().uuid('Invalid ruleId'),
});
export type RuleIdParam = z.infer<typeof ruleIdParamSchema>;

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(150).optional(),
  unit: z.string().trim().max(30).optional(),
  minimumStock: z.coerce.number().nonnegative().max(1_000_000).default(0),
  sellingPrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    brand: z.string().trim().max(150).optional(),
    unit: z.string().trim().max(30).optional(),
    minimumStock: z.coerce.number().nonnegative().max(1_000_000).optional(),
    sellingPrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = paginationSchema.extend({
  category: z.string().trim().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const createBatchSchema = z.object({
  batchNumber: z.string().trim().min(1).max(100),
  expiryDate: z.coerce.date(),
  purchasePrice: z.coerce.number().nonnegative().max(10_000_000),
  mrp: z.coerce.number().nonnegative().max(10_000_000).optional(),
  sellingPrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  currentStock: z.coerce.number().nonnegative().max(1_000_000).default(0),
  supplierId: z.string().uuid().optional(),
  location: z.string().trim().max(150).optional(),
});
export type CreateBatchInput = z.infer<typeof createBatchSchema>;

const adjustableTypes = [
  StockMovementType.DAMAGE,
  StockMovementType.EXPIRY,
  StockMovementType.ADJUSTMENT,
  StockMovementType.RETURN,
] as const;

export const adjustStockSchema = z.object({
  type: z.enum(adjustableTypes),
  // Signed: negative for damage/expiry/write-off, positive for a correction
  // that adds stock back (e.g. a miscount) or a supplier return credit.
  quantity: z.coerce.number().refine((value) => value !== 0, 'Quantity cannot be zero'),
  notes: z.string().trim().max(1000).optional(),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const addConsumptionRuleSchema = z.object({
  productId: z.string().uuid(),
  quantityPerSession: z.coerce.number().positive().max(1_000_000),
});
export type AddConsumptionRuleInput = z.infer<typeof addConsumptionRuleSchema>;
