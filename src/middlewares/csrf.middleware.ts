import ms from 'ms';
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../common/errors/AppError';
import { generateSecureToken, timingSafeEqual } from '../common/utils/crypto';
import { env } from '../config/env';

export const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Double-submit cookie pattern: the refresh token itself lives in an httpOnly
// cookie (inaccessible to JS, so XSS can't read it directly), which means the
// only remaining risk is CSRF — a malicious site making the browser send the
// cookie automatically. We pair it with a second, readable cookie whose value
// the legitimate frontend must echo back in a custom header; a cross-site
// request can trigger the cookie but cannot read it to set the header.
export function issueCsrfCookie(res: Response): string {
  const token = generateSecureToken(32);
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    domain: env.COOKIE_DOMAIN,
    // Mirrors the refresh cookie's lifetime (see auth.controller.ts) — this
    // cookie only exists to protect the refresh-token cookie, so it should
    // never outlive or fall short of it.
    maxAge: ms(env.JWT_REFRESH_EXPIRY),
  });
  return token;
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    throw new ForbiddenError('Missing or invalid CSRF token');
  }
  next();
}
