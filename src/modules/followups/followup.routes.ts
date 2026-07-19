import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as followUpController from './followup.controller';
import {
  completeFollowUpSchema,
  createFollowUpSchema,
  escalateFollowUpSchema,
  idParamSchema,
  listFollowUpsQuerySchema,
} from './followup.validation';

const router = Router();

const FOLLOWUP_STAFF = [
  ...ADMIN_ROLES,
  Role.COUNSELOR,
  Role.RECEPTIONIST,
  Role.MARKETING_TEAM,
] as const;

router.use(authenticate);

router.post(
  '/',
  authorize(...FOLLOWUP_STAFF),
  validate({ body: createFollowUpSchema }),
  followUpController.createFollowUp,
);
router.get(
  '/',
  authorize(...FOLLOWUP_STAFF),
  validate({ query: listFollowUpsQuerySchema }),
  followUpController.listFollowUps,
);
router.post(
  '/:id/complete',
  authorize(...FOLLOWUP_STAFF),
  validate({ params: idParamSchema, body: completeFollowUpSchema }),
  followUpController.completeFollowUp,
);
router.post(
  '/:id/escalate',
  authorize(...FOLLOWUP_STAFF),
  validate({ params: idParamSchema, body: escalateFollowUpSchema }),
  followUpController.escalateFollowUp,
);
router.post(
  '/:id/send-reminder',
  authorize(...FOLLOWUP_STAFF),
  validate({ params: idParamSchema }),
  followUpController.sendReminder,
);
router.post('/mark-overdue', authorize(...ADMIN_ROLES), followUpController.markOverdueAsMissed);

export default router;
