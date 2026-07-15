import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as enrollmentController from './treatment-enrollment.controller';
import {
  createEnrollmentSchema,
  idParamSchema,
  itemIdParamSchema,
  listEnrollmentsQuerySchema,
  recordSessionSchema,
  updateEnrollmentStatusSchema,
} from './treatment-enrollment.validation';

const router = Router();

const ENROLLMENT_MANAGERS = [
  ...ADMIN_ROLES,
  Role.DOCTOR,
  Role.RECEPTIONIST,
  Role.COUNSELOR,
] as const;
const SESSION_PERFORMERS = [...ADMIN_ROLES, Role.DOCTOR] as const;

router.use(authenticate);

router.post(
  '/',
  authorize(...ENROLLMENT_MANAGERS),
  validate({ body: createEnrollmentSchema }),
  enrollmentController.createEnrollment,
);
router.get(
  '/',
  authorize(...ENROLLMENT_MANAGERS, Role.ACCOUNTANT),
  validate({ query: listEnrollmentsQuerySchema }),
  enrollmentController.listEnrollments,
);
router.get(
  '/:id',
  authorize(...ENROLLMENT_MANAGERS, Role.ACCOUNTANT),
  validate({ params: idParamSchema }),
  enrollmentController.getEnrollment,
);
router.patch(
  '/:id/status',
  authorize(...ENROLLMENT_MANAGERS),
  validate({ params: idParamSchema, body: updateEnrollmentStatusSchema }),
  enrollmentController.updateEnrollmentStatus,
);
router.post(
  '/:id/items/:itemId/sessions',
  authorize(...SESSION_PERFORMERS),
  validate({ params: itemIdParamSchema, body: recordSessionSchema }),
  enrollmentController.recordSession,
);

export default router;
