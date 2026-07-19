import { OcrStatus, StockMovementType } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import { ocrProvider } from '../../common/providers/ocr.provider';
import { recordStockMovement } from './stock.service';
import type {
  AddPurchaseInvoiceItemInput,
  ConfirmPurchaseInvoiceItemInput,
  CreatePurchaseInvoiceInput,
  ListPurchaseInvoicesQuery,
} from './purchase.validation';

/// Creates the invoice record and runs it through the OCR provider (best
/// effort — a failure here still leaves the invoice usable via fully manual
/// item entry). See src/common/providers/ocr.provider.ts for why extraction
/// is a no-op today.
export async function createPurchaseInvoice(input: CreatePurchaseInvoiceInput, actorId: string) {
  const invoice = await prisma.purchaseInvoice.create({
    data: { ...input, createdById: actorId, ocrStatus: OcrStatus.PENDING },
  });

  try {
    const extraction = await ocrProvider.extractPurchaseInvoice(input.rawFileUrl);

    await prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        ocrStatus: extraction.succeeded ? OcrStatus.PROCESSED : OcrStatus.FAILED,
        ocrRawResponse: extraction.rawResponse as never,
        totalAmount: extraction.totalAmount,
        invoiceNumber: invoice.invoiceNumber ?? extraction.invoiceNumber,
        invoiceDate: invoice.invoiceDate ?? extraction.invoiceDate,
        items: {
          create: extraction.items.map((item) => ({
            productNameRaw: item.productNameRaw,
            batchNumber: item.batchNumber,
            quantity: item.quantity ?? 0,
            mrp: item.mrp,
            purchasePrice: item.purchasePrice,
            expiryDate: item.expiryDate,
            gstPercent: item.gstPercent,
          })),
        },
      },
    });
  } catch (err) {
    logger.error({ err, invoiceId: invoice.id }, 'OCR extraction failed for purchase invoice');
    await prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: { ocrStatus: OcrStatus.FAILED },
    });
  }

  await recordAudit({
    userId: actorId,
    action: 'PURCHASE_INVOICE_CREATED',
    resource: 'PurchaseInvoice',
    resourceId: invoice.id,
  });

  return getPurchaseInvoiceById(invoice.id);
}

export async function getPurchaseInvoiceById(id: string) {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: { include: { matchedProduct: true } }, supplier: true },
  });
  if (!invoice) throw new NotFoundError('Purchase invoice not found');
  return invoice;
}

export async function listPurchaseInvoices(query: ListPurchaseInvoicesQuery) {
  const where = {
    ...(query.ocrStatus ? { ocrStatus: query.ocrStatus } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: { items: true, supplier: true },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.purchaseInvoice.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

/// Adds a line item by hand — used when OCR found nothing, missed a line, or
/// the invoice was entered fully manually from the start.
export async function addPurchaseInvoiceItem(
  invoiceId: string,
  input: AddPurchaseInvoiceItemInput,
  actorId: string,
) {
  const invoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError('Purchase invoice not found');

  const item = await prisma.purchaseInvoiceItem.create({
    data: { ...input, purchaseInvoiceId: invoiceId },
  });

  await recordAudit({
    userId: actorId,
    action: 'PURCHASE_INVOICE_ITEM_ADDED',
    resource: 'PurchaseInvoice',
    resourceId: invoiceId,
    metadata: { itemId: item.id },
  });

  return item;
}

/// Confirms (and, if needed, corrects) an extracted or manually-added line
/// item, then creates/updates the corresponding ProductBatch and records the
/// PURCHASE stock movement — the point where a purchase invoice actually
/// becomes usable inventory.
export async function confirmPurchaseInvoiceItem(
  invoiceId: string,
  itemId: string,
  input: ConfirmPurchaseInvoiceItemInput,
  actorId: string,
) {
  const item = await prisma.purchaseInvoiceItem.findFirst({
    where: { id: itemId, purchaseInvoiceId: invoiceId },
  });
  if (!item) throw new NotFoundError('Purchase invoice item not found');
  if (item.isValidated) throw new ConflictError('This line item has already been confirmed');

  const product = await prisma.product.findUnique({ where: { id: input.matchedProductId } });
  if (!product) throw new NotFoundError('Product not found');

  const invoice = await prisma.purchaseInvoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const existingBatch = await prisma.productBatch.findUnique({
    where: {
      productId_batchNumber: { productId: input.matchedProductId, batchNumber: input.batchNumber },
    },
  });

  const batch = existingBatch
    ? await prisma.productBatch.update({
        where: { id: existingBatch.id },
        data: {
          purchasePrice: input.purchasePrice,
          mrp: input.mrp,
          gstPercent: input.gstPercent,
          supplierId: invoice.supplierId,
          location: input.location ?? existingBatch.location,
        },
      })
    : await prisma.productBatch.create({
        data: {
          productId: input.matchedProductId,
          batchNumber: input.batchNumber,
          expiryDate: input.expiryDate,
          purchasePrice: input.purchasePrice,
          mrp: input.mrp,
          gstPercent: input.gstPercent,
          supplierId: invoice.supplierId,
          location: input.location,
          currentStock: 0,
        },
      });

  await recordStockMovement(batch.id, StockMovementType.PURCHASE, input.quantity, {
    referenceType: 'PURCHASE_INVOICE',
    referenceId: invoiceId,
    performedById: actorId,
  });

  const updatedItem = await prisma.purchaseInvoiceItem.update({
    where: { id: itemId },
    data: {
      matchedProductId: input.matchedProductId,
      batchNumber: input.batchNumber,
      quantity: input.quantity,
      purchasePrice: input.purchasePrice,
      mrp: input.mrp,
      expiryDate: input.expiryDate,
      gstPercent: input.gstPercent,
      isValidated: true,
    },
  });

  const remainingUnvalidated = await prisma.purchaseInvoiceItem.count({
    where: { purchaseInvoiceId: invoiceId, isValidated: false },
  });
  if (remainingUnvalidated === 0) {
    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { ocrStatus: OcrStatus.MANUALLY_CORRECTED },
    });
  }

  await recordAudit({
    userId: actorId,
    action: 'PURCHASE_INVOICE_ITEM_CONFIRMED',
    resource: 'PurchaseInvoice',
    resourceId: invoiceId,
    metadata: { itemId, productBatchId: batch.id },
  });

  return updatedItem;
}
