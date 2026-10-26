import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as leadController from './lead.controller';
import {
  capturePublicLeadSchema,
  changeLeadStatusSchema,
  convertLeadSchema,
  createLeadSchema,
  exportLeadsQuerySchema,
  idParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from './lead.validation';

const router = Router();

const LEAD_STAFF = [
  Role.SUPER_ADMIN,
  Role.CLINIC_OWNER,
  Role.COUNSELOR,
  Role.RECEPTIONIST,
  Role.MARKETING_TEAM,
] as const;

// Public, unauthenticated website lead-capture form. Rate-limited like other
// public-facing endpoints to blunt spam/scraping.
router.post(
  '/public-capture',
  authRateLimiter,
  validate({ body: capturePublicLeadSchema }),
  leadController.capturePublicLead,
);

router.use(authenticate);

router.post(
  '/',
  authorize(...LEAD_STAFF),
  validate({ body: createLeadSchema }),
  leadController.createLead,
);
router.get(
  '/',
  authorize(...LEAD_STAFF, Role.DOCTOR),
  validate({ query: listLeadsQuerySchema }),
  leadController.listLeads,
);
// Must come before '/:id' — otherwise Express would try to match "export"
// as a lead id.
router.get(
  '/export',
  authorize(...LEAD_STAFF, Role.DOCTOR),
  validate({ query: exportLeadsQuerySchema }),
  leadController.exportLeads,
);
router.get(
  '/:id',
  authorize(...LEAD_STAFF, Role.DOCTOR),
  validate({ params: idParamSchema }),
  leadController.getLead,
);
router.patch(
  '/:id',
  authorize(...LEAD_STAFF),
  validate({ params: idParamSchema, body: updateLeadSchema }),
  leadController.updateLead,
);
router.post(
  '/:id/status',
  authorize(...LEAD_STAFF),
  validate({ params: idParamSchema, body: changeLeadStatusSchema }),
  leadController.changeLeadStatus,
);
router.post(
  '/:id/convert',
  authorize(...LEAD_STAFF),
  validate({ params: idParamSchema, body: convertLeadSchema }),
  leadController.convertLead,
);

export default router;
