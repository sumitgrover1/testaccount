import { OcrStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const itemIdParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
  itemId: z.string().uuid('Invalid itemId'),
});
export type ItemIdParam = z.infer<typeof itemIdParamSchema>;

// The invoice file itself is uploaded directly to blob storage by the client
// (presigned URL) — this API only ever receives the resulting URL, never a
// raw file body, keeping upload handling out of the API process entirely.
export const createPurchaseInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional(),
  rawFileUrl: z.string().trim().url().max(2048),
  invoiceNumber: z.string().trim().max(100).optional(),
  invoiceDate: z.coerce.date().optional(),
});
export type CreatePurchaseInvoiceInput = z.infer<typeof createPurchaseInvoiceSchema>;

export const addPurchaseInvoiceItemSchema = z.object({
  productNameRaw: z.string().trim().min(1).max(255),
  matchedProductId: z.string().uuid().optional(),
  batchNumber: z.string().trim().max(100).optional(),
  quantity: z.coerce.number().positive().max(1_000_000),
  mrp: z.coerce.number().nonnegative().max(10_000_000).optional(),
  purchasePrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
  expiryDate: z.coerce.date().optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
});
export type AddPurchaseInvoiceItemInput = z.infer<typeof addPurchaseInvoiceItemSchema>;

// Confirming a line item is the manual-correction step required before it
// becomes real inventory — every field the schema needs to create a
// ProductBatch must be present here, even if OCR pre-filled some of them.
export const confirmPurchaseInvoiceItemSchema = z.object({
  matchedProductId: z.string().uuid(),
  batchNumber: z.string().trim().min(1).max(100),
  quantity: z.coerce.number().positive().max(1_000_000),
  purchasePrice: z.coerce.number().nonnegative().max(10_000_000),
  mrp: z.coerce.number().nonnegative().max(10_000_000).optional(),
  expiryDate: z.coerce.date(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  location: z.string().trim().max(150).optional(),
});
export type ConfirmPurchaseInvoiceItemInput = z.infer<typeof confirmPurchaseInvoiceItemSchema>;

export const listPurchaseInvoicesQuerySchema = paginationSchema.extend({
  ocrStatus: z.nativeEnum(OcrStatus).optional(),
  supplierId: z.string().uuid().optional(),
});
export type ListPurchaseInvoicesQuery = z.infer<typeof listPurchaseInvoicesQuerySchema>;
