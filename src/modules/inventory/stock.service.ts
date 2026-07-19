import { StockMovementType } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../common/errors/AppError';

interface MovementContext {
  referenceType?: string;
  referenceId?: string;
  performedById: string;
  notes?: string;
}

/// Records a stock movement and applies its effect to the batch's running
/// balance in one place, so every code path that touches stock (purchase,
/// consumption, manual adjustment) goes through the same audited ledger entry.
/// `quantity` is signed: positive increases stock (PURCHASE, RETURN-in),
/// negative decreases it (CONSUMPTION, DAMAGE, EXPIRY, outbound ADJUSTMENT).
export async function recordStockMovement(
  productBatchId: string,
  type: StockMovementType,
  quantity: number,
  ctx: MovementContext,
) {
  const batch = await prisma.productBatch.findUnique({ where: { id: productBatchId } });
  if (!batch) throw new NotFoundError('Product batch not found');

  const newStock = Number(batch.currentStock) + quantity;
  if (newStock < 0) {
    logger.warn(
      { productBatchId, attemptedQuantity: quantity, currentStock: batch.currentStock },
      'Stock movement would drive batch below zero — proceeding, inventory record needs review',
    );
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productBatchId,
        type,
        quantity,
        referenceType: ctx.referenceType,
        referenceId: ctx.referenceId,
        performedById: ctx.performedById,
        notes: ctx.notes,
      },
    }),
    prisma.productBatch.update({ where: { id: productBatchId }, data: { currentStock: newStock } }),
  ]);

  return movement;
}

/// First-expiry-first-out deduction across all of a product's batches — the
/// standard allocation strategy for perishable/cosmetic consumables. If stock
/// runs out mid-deduction, the shortfall is taken from the last batch touched
/// (allowing it to go negative) rather than blocking the caller — a treatment
/// session should never fail to record because of an inventory bookkeeping gap;
/// see the warning logged by recordStockMovement for follow-up.
export async function deductStockFefo(productId: string, quantity: number, ctx: MovementContext) {
  if (quantity <= 0) return [];

  const batches = await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { expiryDate: 'asc' },
  });

  if (batches.length === 0) {
    logger.warn({ productId }, 'No product batches available to deduct stock from');
    return [];
  }

  let remaining = quantity;
  const movements = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = Number(batch.currentStock);
    const take = available > 0 ? Math.min(available, remaining) : 0;
    if (take > 0) {
      movements.push(
        await recordStockMovement(batch.id, StockMovementType.CONSUMPTION, -take, ctx),
      );
      remaining -= take;
    }
  }

  if (remaining > 0) {
    const lastBatch = batches[batches.length - 1];
    movements.push(
      await recordStockMovement(lastBatch.id, StockMovementType.CONSUMPTION, -remaining, ctx),
    );
  }

  return movements;
}
