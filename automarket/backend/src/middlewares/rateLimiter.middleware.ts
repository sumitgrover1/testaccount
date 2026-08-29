import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

// Public forms (on-road price unlock, finance/insurance enquiries, admin login)
// are the spam- and credential-stuffing-prone surface, so they get their own,
// much tighter budget.
export const sensitiveRateLimiter = rateLimit({
  windowMs: env.LEAD_RATE_LIMIT_WINDOW_MS,
  limit: env.LEAD_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later' },
  },
});
