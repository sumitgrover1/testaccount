import ms from 'ms';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../common/errors/AppError';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { generateSecureToken, hashToken } from '../../common/utils/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type { ForgotPasswordInput, LoginInput } from './auth.validation';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Generic, identical message for "user not found" and "wrong password" so the
// API never reveals whether a given email is registered (prevents account
// enumeration via the login endpoint).
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

async function issueTokenPair(userId: string, role: Role, ctx: RequestContext): Promise<TokenPair> {
  const jti = randomUUID();
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRY)),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

export async function login(
  input: LoginInput,
  ctx: RequestContext,
): Promise<TokenPair & { userId: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ForbiddenError('Account is temporarily locked due to repeated failed logins');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Account is disabled');
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password);
  if (!passwordValid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= env.ACCOUNT_LOCKOUT_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failedLoginCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + env.ACCOUNT_LOCKOUT_DURATION_MINUTES * 60_000)
          : undefined,
      },
    });
    if (shouldLock) {
      await recordAudit({
        userId: user.id,
        action: 'AUTH_ACCOUNT_LOCKED',
        resource: 'User',
        resourceId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const tokens = await issueTokenPair(user.id, user.role, ctx);
  await recordAudit({
    userId: user.id,
    action: 'AUTH_LOGIN',
    resource: 'User',
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { ...tokens, userId: user.id };
}

// Refresh tokens are single-use and rotated on every call. If a hash is
// presented that was already revoked (replayed), this is treated as a signal of
// token theft: every outstanding session for the user is revoked, forcing
// re-authentication everywhere.
export async function refresh(rawRefreshToken: string, ctx: RequestContext): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.userId !== payload.sub) {
    throw new UnauthorizedError('Refresh token not recognized');
  }

  if (stored.revokedAt || stored.expiresAt < new Date()) {
    logger.warn({ userId: stored.userId, tokenId: stored.id }, 'Refresh token reuse detected');
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit({
      userId: stored.userId,
      action: 'AUTH_REFRESH_REUSE_DETECTED',
      resource: 'RefreshToken',
      resourceId: stored.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new UnauthorizedError('Refresh token has already been used; all sessions revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account is not active');
  }

  const newTokens = await issueTokenPair(user.id, user.role, ctx);
  const newTokenHash = hashToken(newTokens.refreshToken);

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedBy: newTokenHash },
  });

  return newTokens;
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function forgotPassword(
  input: ForgotPasswordInput,
  ctx: RequestContext,
): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Always behave the same whether or not the account exists, to avoid leaking
  // account existence through response timing/shape. The caller (controller) is
  // responsible for returning a generic "check your email" response regardless.
  if (!user) return null;

  const rawToken = generateSecureToken(32);
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });

  await recordAudit({
    userId: user.id,
    action: 'AUTH_PASSWORD_RESET_REQUESTED',
    resource: 'User',
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  // In production this token is delivered exclusively via a transactional email
  // provider — it must never be logged or returned in an API response.
  return rawToken;
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
  ctx: RequestContext,
): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired password reset token');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordAudit({
    userId: stored.userId,
    action: 'AUTH_PASSWORD_RESET_COMPLETED',
    resource: 'User',
    resourceId: stored.userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordAudit({
    userId,
    action: 'AUTH_PASSWORD_CHANGED',
    resource: 'User',
    resourceId: userId,
  });
}
