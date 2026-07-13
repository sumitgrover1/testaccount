import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import type { NextFunction, Request, Response } from 'express';
import { corsOrigins, env } from '../config/env';
import { logger } from '../config/logger';

// Strict allowlist CORS: no wildcard, credentials only for known origins.
// A request with no Origin header (server-to-server, curl, mobile) is allowed
// through since the browser same-origin policy doesn't apply to it.
export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin }, 'Blocked CORS request from disallowed origin');
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token'],
  maxAge: 600,
});

// Helmet applies a broad set of security headers (HSTS, X-Content-Type-Options,
// X-Frame-Options, Referrer-Policy, etc.). CSP is scoped down for an API-only
// service — no inline scripts/styles are ever served by this backend.
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'no-referrer' },
});

// HTTP Parameter Pollution guard — prevents ?role=STUDENT&role=ADMIN style
// duplicate-key tricks from confusing query parsing.
export const hppMiddleware = hpp();

// Enterprise deployments typically terminate TLS at a load balancer; this
// enforces HTTPS end-to-end by rejecting/redirecting plain HTTP once behind
// a trusted proxy that sets X-Forwarded-Proto.
export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV !== 'production' || !env.TRUST_PROXY) {
    next();
    return;
  }
  if (req.secure || req.header('x-forwarded-proto') === 'https') {
    next();
    return;
  }
  res.status(403).json({
    error: { code: 'HTTPS_REQUIRED', message: 'HTTPS is required' },
  });
}
