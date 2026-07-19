import { PriceEntityType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  CreateTreatmentInput,
  ListTreatmentsQuery,
  UpdateTreatmentInput,
} from './treatment.validation';

export async function createTreatment(input: CreateTreatmentInput, actingUserId: string) {
  const treatment = await prisma.treatment.create({
    data: {
      name: input.name,
      category: input.category,
      description: input.description,
      defaultPrice: input.defaultPrice,
      durationMinutes: input.durationMinutes,
      numberOfSessions: input.numberOfSessions,
    },
  });

  await prisma.priceHistory.create({
    data: {
      entityType: PriceEntityType.TREATMENT,
      entityId: treatment.id,
      newPrice: treatment.defaultPrice,
      changedById: actingUserId,
      reason: 'Initial price on creation',
    },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'TREATMENT_CREATED',
    resource: 'Treatment',
    resourceId: treatment.id,
  });

  return treatment;
}

export async function getTreatmentById(id: string) {
  const treatment = await prisma.treatment.findUnique({ where: { id } });
  if (!treatment) throw new NotFoundError('Treatment not found');
  return treatment;
}

export async function listTreatments(query: ListTreatmentsQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { name: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.treatment.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.treatment.count({ where }),
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

export async function updateTreatment(
  id: string,
  input: UpdateTreatmentInput,
  actingUserId: string,
) {
  const existing = await prisma.treatment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Treatment not found');

  const { priceChangeReason, ...data } = input;

  const updated = await prisma.treatment.update({ where: { id }, data });

  if (input.defaultPrice !== undefined && input.defaultPrice !== Number(existing.defaultPrice)) {
    await prisma.priceHistory.create({
      data: {
        entityType: PriceEntityType.TREATMENT,
        entityId: id,
        oldPrice: existing.defaultPrice,
        newPrice: input.defaultPrice,
        changedById: actingUserId,
        reason: priceChangeReason,
      },
    });
  }

  await recordAudit({
    userId: actingUserId,
    action: 'TREATMENT_UPDATED',
    resource: 'Treatment',
    resourceId: id,
    metadata: { changes: data },
  });

  return updated;
}

// Public, unauthenticated catalog listing for the marketing website's
// Services page. Deliberately excludes defaultPrice/isActive/timestamps —
// this clinic's pricing is patient-specific (see pricing.service.ts) and
// isn't disclosed pre-consultation; only active treatments are ever shown.
export async function listPublicTreatments() {
  return prisma.treatment.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      durationMinutes: true,
      numberOfSessions: true,
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function getTreatmentPriceHistory(id: string) {
  const treatment = await prisma.treatment.findUnique({ where: { id }, select: { id: true } });
  if (!treatment) throw new NotFoundError('Treatment not found');

  return prisma.priceHistory.findMany({
    where: { entityType: PriceEntityType.TREATMENT, entityId: id },
    orderBy: { changedAt: 'desc' },
  });
}
