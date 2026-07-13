import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authenticateOptional } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as courseController from './course.controller';
import {
  createCourseSchema,
  idParamSchema,
  listCoursesQuerySchema,
  updateCourseSchema,
} from './course.validation';

const router = Router();

// Public browsing (published courses only); authenticated instructors/admins get
// additional visibility into drafts they own — handled in course.service.ts.
router.get(
  '/',
  authenticateOptional,
  validate({ query: listCoursesQuerySchema }),
  courseController.listCourses,
);
router.get(
  '/:id',
  authenticateOptional,
  validate({ params: idParamSchema }),
  courseController.getCourse,
);

router.post(
  '/',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN),
  validate({ body: createCourseSchema }),
  courseController.createCourse,
);
router.patch(
  '/:id',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: idParamSchema, body: updateCourseSchema }),
  courseController.updateCourse,
);
router.delete(
  '/:id',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: idParamSchema }),
  courseController.deleteCourse,
);

export default router;
