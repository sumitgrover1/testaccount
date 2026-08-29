import type { AdminUser } from '@prisma/client';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../common/errors/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import { verifyPassword } from '../../common/utils/password';

function tokensFor(user: Pick<AdminUser, 'id' | 'email' | 'role'>) {
  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    refreshToken: signRefreshToken({ sub: user.id }),
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });

  // Verify against a dummy hash when the account is missing so that a wrong
  // email and a wrong password take the same time — otherwise the response
  // latency enumerates valid accounts.
  const hash = user?.passwordHash ?? '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000';
  const passwordMatches = await verifyPassword(hash, password);

  if (!user || !user.isActive || !passwordMatches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    ...tokensFor(user),
  };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user?.isActive) throw new UnauthorizedError('Account is inactive');
  return tokensFor(user);
}

export async function profile(userId: string) {
  return prisma.adminUser.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, lastLoginAt: true },
  });
}
