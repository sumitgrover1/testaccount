import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as communicationController from './communication.controller';
import { createCommunicationLogSchema, idParamSchema } from './communication.validation';

const router = Router();

const TIMELINE_STAFF = [
  ...ADMIN_ROLES,
  Role.DOCTOR,
  Role.RECEPTIONIST,
  Role.COUNSELOR,
  Role.MARKETING_TEAM,
] as const;

router.use(authenticate);

router.post(
  '/',
  authorize(...TIMELINE_STAFF),
  validate({ body: createCommunicationLogSchema }),
  communicationController.createCommunicationLog,
);
router.get(
  '/patients/:id/timeline',
  authorize(...TIMELINE_STAFF, Role.ACCOUNTANT),
  validate({ params: idParamSchema }),
  communicationController.getPatientTimeline,
);
router.get(
  '/leads/:id/timeline',
  authorize(...TIMELINE_STAFF),
  validate({ params: idParamSchema }),
  communicationController.getLeadTimeline,
);

export default router;
