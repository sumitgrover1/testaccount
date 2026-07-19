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
  resetPasswordSchema,
} from './auth.validation';

const router = Router();

// Staff accounts are provisioned by an admin (see users.routes.ts POST /users) —
// there is no public self-registration endpoint on a clinic staff system.
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
