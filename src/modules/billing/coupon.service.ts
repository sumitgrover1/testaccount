import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type { CreateCouponInput, ListCouponsQuery, UpdateCouponInput } from './coupon.validation';

export async function createCoupon(input: CreateCouponInput, actorId: string) {
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) throw new ConflictError('A coupon with this code already exists');

  const coupon = await prisma.coupon.create({ data: input });
  await recordAudit({
    userId: actorId,
    action: 'COUPON_CREATED',
    resource: 'Coupon',
    resourceId: coupon.id,
  });
  return coupon;
}

export async function listCoupons(query: ListCouponsQuery) {
  const where = { ...(query.isActive !== undefined ? { isActive: query.isActive } : {}) };

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.coupon.count({ where }),
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

export async function updateCoupon(id: string, input: UpdateCouponInput, actorId: string) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Coupon not found');

  const updated = await prisma.coupon.update({ where: { id }, data: input });
  await recordAudit({
    userId: actorId,
    action: 'COUPON_UPDATED',
    resource: 'Coupon',
    resourceId: id,
    metadata: { changes: input },
  });
  return updated;
}

/// Validates a coupon is currently redeemable and returns the discount it
/// contributes for the given subtotal — used by invoice.service.ts, not
/// exposed directly as an endpoint.
export async function resolveCouponDiscount(code: string, subtotal: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.isActive) throw new BadRequestError('Invalid or inactive coupon code');

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now)
    throw new BadRequestError('This coupon is not yet valid');
  if (coupon.validTo && coupon.validTo < now) throw new BadRequestError('This coupon has expired');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new BadRequestError('This coupon has reached its usage limit');
  }

  const discount = coupon.discountPercent
    ? subtotal * (Number(coupon.discountPercent) / 100)
    : Number(coupon.discountAmount ?? 0);

  return { couponId: coupon.id, discount };
}

export async function incrementCouponUsage(couponId: string) {
  await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
}
