import { Router } from 'express';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { verifyCsrf } from '../../middlewares/csrf.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as authController from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validation';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

// Refresh/logout rely on the httpOnly refresh cookie, so they need CSRF
// protection (see csrf.middleware.ts for the double-submit rationale).
router.post('/refresh', authRateLimiter, verifyCsrf, authController.refresh);
router.post('/logout', verifyCsrf, authController.logout);
router.post('/logout-all', authenticate, verifyCsrf, authController.logoutAll);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;
