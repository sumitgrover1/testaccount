import { StockMovementType } from '@prisma/client';
import { prisma } from '../../config/database';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import { deductStockFefo, recordStockMovement } from './stock.service';
import type {
  AddConsumptionRuleInput,
  AdjustStockInput,
  CreateBatchInput,
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.validation';

export async function createProduct(input: CreateProductInput, actorId: string) {
  const product = await prisma.product.create({ data: input });
  await recordAudit({
    userId: actorId,
    action: 'PRODUCT_CREATED',
    resource: 'Product',
    resourceId: product.id,
  });
  return product;
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: { batches: true } });
  if (!product) throw new NotFoundError('Product not found');
  return product;
}

export async function listProducts(query: ListProductsQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { name: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.product.count({ where }),
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

export async function updateProduct(id: string, input: UpdateProductInput, actorId: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Product not found');

  const updated = await prisma.product.update({ where: { id }, data: input });
  await recordAudit({
    userId: actorId,
    action: 'PRODUCT_UPDATED',
    resource: 'Product',
    resourceId: id,
    metadata: { changes: input },
  });
  return updated;
}

/// Products whose total stock across all batches has fallen below the
/// configured minimum — powers the dashboard's low-stock alert widget.
export async function listLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { batches: { select: { currentStock: true } } },
  });

  return products
    .map((product) => ({
      ...product,
      totalStock: product.batches.reduce((sum, batch) => sum + Number(batch.currentStock), 0),
      batches: undefined,
    }))
    .filter((product) => product.totalStock < Number(product.minimumStock));
}

export async function createBatch(productId: string, input: CreateBatchInput, actorId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError('Product not found');

  const existing = await prisma.productBatch.findUnique({
    where: { productId_batchNumber: { productId, batchNumber: input.batchNumber } },
  });
  if (existing) throw new ConflictError('A batch with this number already exists for this product');

  const batch = await prisma.productBatch.create({ data: { ...input, productId } });

  if (input.currentStock > 0) {
    await recordStockMovement(batch.id, StockMovementType.PURCHASE, input.currentStock, {
      referenceType: 'MANUAL_BATCH_ENTRY',
      performedById: actorId,
      notes: 'Initial stock on batch creation',
    });
  }

  await recordAudit({
    userId: actorId,
    action: 'PRODUCT_BATCH_CREATED',
    resource: 'ProductBatch',
    resourceId: batch.id,
    metadata: { productId },
  });

  return batch;
}

export async function listBatchesForProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw new NotFoundError('Product not found');

  return prisma.productBatch.findMany({ where: { productId }, orderBy: { expiryDate: 'asc' } });
}

export async function adjustBatchStock(
  productId: string,
  batchId: string,
  input: AdjustStockInput,
  actorId: string,
) {
  const batch = await prisma.productBatch.findFirst({ where: { id: batchId, productId } });
  if (!batch) throw new NotFoundError('Product batch not found');

  return recordStockMovement(batchId, input.type, input.quantity, {
    referenceType: 'MANUAL_ADJUSTMENT',
    performedById: actorId,
    notes: input.notes,
  });
}

export async function listBatchMovements(productId: string, batchId: string) {
  const batch = await prisma.productBatch.findFirst({ where: { id: batchId, productId } });
  if (!batch) throw new NotFoundError('Product batch not found');

  return prisma.stockMovement.findMany({
    where: { productBatchId: batchId },
    orderBy: { performedAt: 'desc' },
  });
}

export async function addConsumptionRule(
  treatmentId: string,
  input: AddConsumptionRuleInput,
  actorId: string,
) {
  const [treatment, product] = await Promise.all([
    prisma.treatment.findUnique({ where: { id: treatmentId } }),
    prisma.product.findUnique({ where: { id: input.productId } }),
  ]);
  if (!treatment) throw new NotFoundError('Treatment not found');
  if (!product) throw new NotFoundError('Product not found');

  const existing = await prisma.productConsumptionRule.findUnique({
    where: { treatmentId_productId: { treatmentId, productId: input.productId } },
  });
  if (existing)
    throw new ConflictError('A consumption rule for this product already exists on this treatment');

  const rule = await prisma.productConsumptionRule.create({
    data: { treatmentId, productId: input.productId, quantityPerSession: input.quantityPerSession },
    include: { product: true },
  });

  await recordAudit({
    userId: actorId,
    action: 'CONSUMPTION_RULE_ADDED',
    resource: 'Treatment',
    resourceId: treatmentId,
    metadata: { productId: input.productId, quantityPerSession: input.quantityPerSession },
  });

  return rule;
}

export async function listConsumptionRules(treatmentId: string) {
  const treatment = await prisma.treatment.findUnique({
    where: { id: treatmentId },
    select: { id: true },
  });
  if (!treatment) throw new NotFoundError('Treatment not found');

  return prisma.productConsumptionRule.findMany({
    where: { treatmentId },
    include: { product: true },
  });
}

export async function removeConsumptionRule(treatmentId: string, ruleId: string, actorId: string) {
  const rule = await prisma.productConsumptionRule.findFirst({
    where: { id: ruleId, treatmentId },
  });
  if (!rule) throw new NotFoundError('Consumption rule not found');

  await prisma.productConsumptionRule.delete({ where: { id: ruleId } });

  await recordAudit({
    userId: actorId,
    action: 'CONSUMPTION_RULE_REMOVED',
    resource: 'Treatment',
    resourceId: treatmentId,
    metadata: { ruleId },
  });
}

/// Auto-deducts stock for every product a treatment consumes by default, when
/// a session is performed. Called from treatment-enrollment.service.ts
/// (recordSession) — kept here since it belongs to inventory's domain, not
/// enrollment's.
export async function consumeForSession(
  treatmentId: string,
  treatmentSessionId: string,
  performedById: string,
) {
  const rules = await prisma.productConsumptionRule.findMany({ where: { treatmentId } });
  if (rules.length === 0) return;

  for (const rule of rules) {
    const movements = await deductStockFefo(rule.productId, Number(rule.quantityPerSession), {
      referenceType: 'TREATMENT_SESSION',
      referenceId: treatmentSessionId,
      performedById,
    });

    for (const movement of movements) {
      await prisma.productConsumption.create({
        data: {
          treatmentSessionId,
          productBatchId: movement.productBatchId,
          quantity: -Number(movement.quantity),
        },
      });
    }
  }
}
