import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { sensitiveRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as leadController from './lead.controller';
import {
  createPublicLeadSchema,
  idParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from './lead.validation';

const router = Router();

const LEAD_STAFF = [AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SALES_AGENT] as const;

// Public website forms: "get on-road price", "book a test drive", "request a
// callback". Tightly rate-limited because this is the spam surface.
router.post(
  '/capture',
  sensitiveRateLimiter,
  validate({ body: createPublicLeadSchema }),
  leadController.capturePublicLead,
);

router.use(authenticate);

router.get(
  '/',
  authorize(...LEAD_STAFF),
  validate({ query: listLeadsQuerySchema }),
  leadController.listLeads,
);
router.get(
  '/:id',
  authorize(...LEAD_STAFF),
  validate({ params: idParamSchema }),
  leadController.getLead,
);
router.patch(
  '/:id',
  authorize(...LEAD_STAFF),
  validate({ params: idParamSchema, body: updateLeadSchema }),
  leadController.updateLead,
);

export default router;
