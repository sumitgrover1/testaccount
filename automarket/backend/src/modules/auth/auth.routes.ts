import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { sensitiveRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as authController from './auth.controller';
import { loginSchema, refreshSchema } from './auth.validation';

const router = Router();

router.post('/login', sensitiveRateLimiter, validate({ body: loginSchema }), authController.login);
router.post(
  '/refresh',
  sensitiveRateLimiter,
  validate({ body: refreshSchema }),
  authController.refresh,
);
router.get('/me', authenticate, authController.me);

export default router;
