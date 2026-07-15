import { Router } from 'express';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as userController from './user.controller';
import {
  createStaffSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserAdminSchema,
} from './user.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate({ body: updateProfileSchema }), userController.updateMe);

// Staff accounts are admin-provisioned only — no public self-registration.
router.post(
  '/',
  authorize(...ADMIN_ROLES),
  validate({ body: createStaffSchema }),
  userController.createStaffUser,
);
router.get(
  '/',
  authorize(...ADMIN_ROLES),
  validate({ query: listUsersQuerySchema }),
  userController.listUsers,
);
router.get(
  '/:id',
  authorize(...ADMIN_ROLES),
  validate({ params: idParamSchema }),
  userController.getUser,
);
router.patch(
  '/:id',
  authorize(...ADMIN_ROLES),
  validate({ params: idParamSchema, body: updateUserAdminSchema }),
  userController.updateUserAsAdmin,
);

export default router;
