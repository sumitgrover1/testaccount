import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES, PRICING_APPROVER_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as pricingController from './pricing.controller';
import {
  getEffectivePriceQuerySchema,
  idParamSchema,
  listPricingRequestsQuerySchema,
  reviewPricingRequestSchema,
  setPatientTreatmentPriceSchema,
} from './pricing.validation';

const router = Router();

const PRICING_SETTERS = [...ADMIN_ROLES, Role.DOCTOR, Role.COUNSELOR, Role.RECEPTIONIST] as const;

router.use(authenticate);

router.get(
  '/effective-price',
  authorize(...PRICING_SETTERS, Role.ACCOUNTANT),
  validate({ query: getEffectivePriceQuerySchema }),
  pricingController.getEffectivePrice,
);
router.post(
  '/patient-treatment-price',
  authorize(...PRICING_SETTERS),
  validate({ body: setPatientTreatmentPriceSchema }),
  pricingController.setPatientTreatmentPrice,
);
router.get(
  '/patient-treatment-price/history',
  authorize(...PRICING_SETTERS, Role.ACCOUNTANT),
  validate({ query: getEffectivePriceQuerySchema }),
  pricingController.getPatientTreatmentPriceHistory,
);

router.get(
  '/requests',
  authorize(...PRICING_APPROVER_ROLES, Role.COUNSELOR),
  validate({ query: listPricingRequestsQuerySchema }),
  pricingController.listPricingRequests,
);
router.post(
  '/requests/:id/review',
  authorize(...PRICING_APPROVER_ROLES),
  validate({ params: idParamSchema, body: reviewPricingRequestSchema }),
  pricingController.reviewPricingRequest,
);

export default router;
