import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import type { NextFunction, Request, Response } from 'express';
import { env, isProduction } from '../config/env';
import { ForbiddenError } from '../common/errors/AppError';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Server-to-server calls (SSR from the Next.js site, cron jobs) send no
    // Origin header and are allowed; browser origins must be allow-listed.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ForbiddenError('Origin not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const hppMiddleware = hpp();

export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (isProduction && req.protocol !== 'https') {
    res.redirect(308, `https://${req.headers.host ?? ''}${req.originalUrl}`);
    return;
  }
  next();
}
