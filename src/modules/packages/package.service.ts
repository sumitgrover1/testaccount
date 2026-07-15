import { PriceEntityType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  AddPackageItemInput,
  CreatePackageInput,
  ListPackagesQuery,
  UpdatePackageInput,
  UpdatePackageItemInput,
} from './package.validation';

const WITH_ITEMS = { items: { include: { treatment: true } } } as const;

export async function createPackage(input: CreatePackageInput, actingUserId: string) {
  const pkg = await prisma.package.create({
    data: {
      name: input.name,
      description: input.description,
      defaultPrice: input.defaultPrice,
      discountPercent: input.discountPercent,
      validityDays: input.validityDays,
      items: { create: input.items },
    },
    include: WITH_ITEMS,
  });

  await prisma.priceHistory.create({
    data: {
      entityType: PriceEntityType.PACKAGE,
      entityId: pkg.id,
      newPrice: pkg.defaultPrice,
      changedById: actingUserId,
      reason: 'Initial price on creation',
    },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'PACKAGE_CREATED',
    resource: 'Package',
    resourceId: pkg.id,
  });

  return pkg;
}

export async function getPackageById(id: string) {
  const pkg = await prisma.package.findUnique({ where: { id }, include: WITH_ITEMS });
  if (!pkg) throw new NotFoundError('Package not found');
  return pkg;
}

export async function listPackages(query: ListPackagesQuery) {
  const where = {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { name: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.package.findMany({
      where,
      include: WITH_ITEMS,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.package.count({ where }),
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

export async function updatePackage(id: string, input: UpdatePackageInput, actingUserId: string) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Package not found');

  const { priceChangeReason, ...data } = input;
  const updated = await prisma.package.update({ where: { id }, data, include: WITH_ITEMS });

  if (input.defaultPrice !== undefined && input.defaultPrice !== Number(existing.defaultPrice)) {
    await prisma.priceHistory.create({
      data: {
        entityType: PriceEntityType.PACKAGE,
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
    action: 'PACKAGE_UPDATED',
    resource: 'Package',
    resourceId: id,
    metadata: { changes: data },
  });

  return updated;
}

export async function addPackageItem(
  packageId: string,
  input: AddPackageItemInput,
  actingUserId: string,
) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('Package not found');

  const item = await prisma.packageTreatment.create({
    data: { packageId, treatmentId: input.treatmentId, quantity: input.quantity },
    include: { treatment: true },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'PACKAGE_ITEM_ADDED',
    resource: 'Package',
    resourceId: packageId,
    metadata: { treatmentId: input.treatmentId, quantity: input.quantity },
  });

  return item;
}

export async function updatePackageItem(
  packageId: string,
  itemId: string,
  input: UpdatePackageItemInput,
  actingUserId: string,
) {
  const item = await prisma.packageTreatment.findFirst({ where: { id: itemId, packageId } });
  if (!item) throw new NotFoundError('Package item not found');

  const updated = await prisma.packageTreatment.update({
    where: { id: itemId },
    data: { quantity: input.quantity },
    include: { treatment: true },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'PACKAGE_ITEM_UPDATED',
    resource: 'Package',
    resourceId: packageId,
    metadata: { itemId, quantity: input.quantity },
  });

  return updated;
}

export async function removePackageItem(packageId: string, itemId: string, actingUserId: string) {
  const item = await prisma.packageTreatment.findFirst({ where: { id: itemId, packageId } });
  if (!item) throw new NotFoundError('Package item not found');

  await prisma.packageTreatment.delete({ where: { id: itemId } });

  await recordAudit({
    userId: actingUserId,
    action: 'PACKAGE_ITEM_REMOVED',
    resource: 'Package',
    resourceId: packageId,
    metadata: { itemId },
  });
}
