import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as enrollmentController from './enrollment.controller';
import {
  enrollSchema,
  idParamSchema,
  listEnrollmentsQuerySchema,
  updateEnrollmentStatusSchema,
} from './enrollment.validation';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(Role.STUDENT),
  validate({ body: enrollSchema }),
  enrollmentController.enroll,
);
router.get(
  '/me',
  validate({ query: listEnrollmentsQuerySchema }),
  enrollmentController.listMyEnrollments,
);
router.get(
  '/course/:id',
  authorize(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: idParamSchema, query: listEnrollmentsQuerySchema }),
  enrollmentController.listCourseEnrollments,
);
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateEnrollmentStatusSchema }),
  enrollmentController.updateEnrollmentStatus,
);

export default router;
