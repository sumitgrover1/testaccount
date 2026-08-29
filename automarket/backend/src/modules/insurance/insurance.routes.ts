import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { sensitiveRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as insuranceController from './insurance.controller';
import {
  applySchema,
  idParamSchema,
  listAddOnsQuerySchema,
  listApplicationsQuerySchema,
  listInsurersQuerySchema,
  quoteSchema,
  updateApplicationSchema,
} from './insurance.validation';

const router = Router();

router.get(
  '/insurers',
  validate({ query: listInsurersQuerySchema }),
  insuranceController.listInsurers,
);
router.get('/add-ons', validate({ query: listAddOnsQuerySchema }), insuranceController.listAddOns);
// Comparing premiums is free; the lead is captured when a plan is chosen.
router.post('/quotes', validate({ body: quoteSchema }), insuranceController.getQuotes);
router.post(
  '/apply',
  sensitiveRateLimiter,
  validate({ body: applySchema }),
  insuranceController.apply,
);

router.use(authenticate);

const INSURANCE_STAFF = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPS_MANAGER,
  AdminRole.SALES_AGENT,
] as const;

router.get(
  '/applications',
  authorize(...INSURANCE_STAFF),
  validate({ query: listApplicationsQuerySchema }),
  insuranceController.listApplications,
);
router.patch(
  '/applications/:id',
  authorize(...INSURANCE_STAFF),
  validate({ params: idParamSchema, body: updateApplicationSchema }),
  insuranceController.updateApplication,
);

export default router;
