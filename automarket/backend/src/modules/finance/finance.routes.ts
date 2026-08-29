import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { sensitiveRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as financeController from './finance.controller';
import {
  applySchema,
  eligibilitySchema,
  emiSchema,
  idParamSchema,
  listApplicationsQuerySchema,
  listOffersQuerySchema,
  updateApplicationSchema,
} from './finance.validation';

const router = Router();

// Calculators and offer comparison stay free and anonymous — the lead is asked
// for at the point of applying, not for doing the maths.
router.post('/emi', validate({ body: emiSchema }), financeController.calculateEmi);
router.get('/offers', validate({ query: listOffersQuerySchema }), financeController.listOffers);
router.post(
  '/eligibility',
  validate({ body: eligibilitySchema }),
  financeController.checkEligibility,
);
router.post(
  '/apply',
  sensitiveRateLimiter,
  validate({ body: applySchema }),
  financeController.apply,
);

router.use(authenticate);

const FINANCE_STAFF = [AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SALES_AGENT] as const;

router.get(
  '/applications',
  authorize(...FINANCE_STAFF),
  validate({ query: listApplicationsQuerySchema }),
  financeController.listApplications,
);
router.patch(
  '/applications/:id',
  authorize(...FINANCE_STAFF),
  validate({ params: idParamSchema, body: updateApplicationSchema }),
  financeController.updateApplication,
);

export default router;
