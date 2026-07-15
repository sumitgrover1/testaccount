import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from './supplier.validation';

export async function createSupplier(input: CreateSupplierInput, actorId: string) {
  const supplier = await prisma.supplier.create({ data: input });
  await recordAudit({
    userId: actorId,
    action: 'SUPPLIER_CREATED',
    resource: 'Supplier',
    resourceId: supplier.id,
  });
  return supplier;
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new NotFoundError('Supplier not found');
  return supplier;
}

export async function listSuppliers(query: ListSuppliersQuery) {
  const where = {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { name: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.supplier.count({ where }),
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

export async function updateSupplier(id: string, input: UpdateSupplierInput, actorId: string) {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Supplier not found');

  const updated = await prisma.supplier.update({ where: { id }, data: input });
  await recordAudit({
    userId: actorId,
    action: 'SUPPLIER_UPDATED',
    resource: 'Supplier',
    resourceId: id,
    metadata: { changes: input },
  });
  return updated;
}
