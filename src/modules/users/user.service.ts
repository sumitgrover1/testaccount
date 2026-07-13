import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type { ListUsersQuery, UpdateProfileInput, UpdateUserAdminInput } from './user.validation';

// Fields safe to expose to clients — never returns passwordHash or lockout
// counters, which are internal security state.
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: PUBLIC_USER_SELECT,
  });
}

export async function listUsers(query: ListUsersQuery) {
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search } },
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.user.count({ where }),
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

export async function updateUserAsAdmin(
  targetUserId: string,
  input: UpdateUserAdminInput,
  actingAdminId: string,
) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new NotFoundError('User not found');

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: input,
    select: PUBLIC_USER_SELECT,
  });

  // Immediate revocation of all sessions when an account is deactivated or its
  // role is changed, so the change takes effect right away rather than waiting
  // for the (short-lived) access token to expire.
  if (input.isActive === false || input.role) {
    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await recordAudit({
    userId: actingAdminId,
    action: 'USER_ADMIN_UPDATE',
    resource: 'User',
    resourceId: targetUserId,
    metadata: { changes: input },
  });

  return updated;
}
