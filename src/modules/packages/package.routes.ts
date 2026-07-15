import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as packageController from './package.controller';
import {
  addPackageItemSchema,
  createPackageSchema,
  idParamSchema,
  itemIdParamSchema,
  listPackagesQuerySchema,
  updatePackageItemSchema,
  updatePackageSchema,
} from './package.validation';

const router = Router();

const PACKAGE_MANAGERS = [...ADMIN_ROLES, Role.DOCTOR] as const;

router.use(authenticate);

router.post(
  '/',
  authorize(...PACKAGE_MANAGERS),
  validate({ body: createPackageSchema }),
  packageController.createPackage,
);
router.get('/', validate({ query: listPackagesQuerySchema }), packageController.listPackages);
router.get('/:id', validate({ params: idParamSchema }), packageController.getPackage);
router.patch(
  '/:id',
  authorize(...PACKAGE_MANAGERS),
  validate({ params: idParamSchema, body: updatePackageSchema }),
  packageController.updatePackage,
);

router.post(
  '/:id/items',
  authorize(...PACKAGE_MANAGERS),
  validate({ params: idParamSchema, body: addPackageItemSchema }),
  packageController.addPackageItem,
);
router.patch(
  '/:id/items/:itemId',
  authorize(...PACKAGE_MANAGERS),
  validate({ params: itemIdParamSchema, body: updatePackageItemSchema }),
  packageController.updatePackageItem,
);
router.delete(
  '/:id/items/:itemId',
  authorize(...PACKAGE_MANAGERS),
  validate({ params: itemIdParamSchema }),
  packageController.removePackageItem,
);

export default router;
