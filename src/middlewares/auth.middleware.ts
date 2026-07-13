import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../common/errors/AppError';
import { verifyAccessToken } from '../common/utils/jwt';
import { asyncHandler } from '../common/utils/asyncHandler';
import { prisma } from '../config/database';

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

// Verifies the access token and re-checks the user's current status/role in the
// database. This costs one indexed lookup per request but ensures a disabled
// account or a role downgrade takes effect immediately rather than waiting out
// the (short-lived) access token's remaining validity.
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true, lockedUntil: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account is not active');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked');
    }

    req.user = { id: user.id, role: user.role };
    next();
  },
);

// Best-effort auth: populates req.user when a valid token is present but does not
// reject the request otherwise. Useful for endpoints with public + enhanced views.
export const authenticateOptional = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isActive: true },
      });
      if (user?.isActive) {
        req.user = { id: user.id, role: user.role };
      }
    } catch {
      // Ignore invalid tokens on optional auth — treat as anonymous.
    }
    next();
  },
);
