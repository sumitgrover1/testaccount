import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as userController from './user.controller';
import {
  idParamSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserAdminSchema,
} from './user.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate({ body: updateProfileSchema }), userController.updateMe);

router.get(
  '/',
  authorize(Role.ADMIN),
  validate({ query: listUsersQuerySchema }),
  userController.listUsers,
);
router.get(
  '/:id',
  authorize(Role.ADMIN),
  validate({ params: idParamSchema }),
  userController.getUser,
);
router.patch(
  '/:id',
  authorize(Role.ADMIN),
  validate({ params: idParamSchema, body: updateUserAdminSchema }),
  userController.updateUserAsAdmin,
);

export default router;
