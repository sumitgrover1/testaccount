import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import * as dashboardController from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.get(
  '/overview',
  authorize(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SALES_AGENT),
  dashboardController.getOverview,
);

export default router;
