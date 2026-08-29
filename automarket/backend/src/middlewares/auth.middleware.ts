import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { UnauthorizedError } from '../common/errors/AppError';
import { verifyAccessToken } from '../common/utils/jwt';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }
    const payload = verifyAccessToken(header.slice('Bearer '.length));

    // Re-check the account on every request so a deactivated agent loses access
    // immediately rather than when their token happens to expire.
    const user = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedError('Account is inactive');

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}
