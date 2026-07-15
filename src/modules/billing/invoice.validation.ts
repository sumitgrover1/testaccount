import { InvoiceItemType, InvoiceStatus, PaymentMode } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

const invoiceItemSchema = z
  .object({
    itemType: z.nativeEnum(InvoiceItemType),
    treatmentId: z.string().uuid().optional(),
    packageId: z.string().uuid().optional(),
    enrollmentId: z.string().uuid().optional(),
    productBatchId: z.string().uuid().optional(),
    description: z.string().trim().min(1).max(255),
    quantity: z.coerce.number().positive().max(10_000).default(1),
    unitPrice: z.coerce.number().nonnegative().max(10_000_000),
    discountPercent: z.coerce.number().min(0).max(100).default(0),
    gstPercent: z.coerce.number().min(0).max(100).default(0),
  })
  .refine(
    (item) =>
      (item.itemType === InvoiceItemType.TREATMENT && item.treatmentId) ||
      (item.itemType === InvoiceItemType.PACKAGE && item.packageId) ||
      (item.itemType === InvoiceItemType.PRODUCT && item.productBatchId),
    { message: 'Item must reference the id matching its itemType', path: ['itemType'] },
  );

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  items: z.array(invoiceItemSchema).min(1, 'An invoice must have at least one item'),
  doctorDiscountAmount: z.coerce.number().nonnegative().max(10_000_000).default(0),
  couponCode: z.string().trim().max(50).optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const addPaymentSchema = z.object({
  amount: z.coerce.number().positive().max(10_000_000),
  mode: z.nativeEnum(PaymentMode),
  transactionRef: z.string().trim().max(150).optional(),
});
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

export const listInvoicesQuerySchema = paginationSchema.extend({
  patientId: z.string().uuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
