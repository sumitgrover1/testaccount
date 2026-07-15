import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as dashboardController from './dashboard.controller';
import { dateRangeQuerySchema, topTreatmentsQuerySchema } from './dashboard.validation';

const router = Router();

// Management-facing reporting — restricted to admins, with a few metrics
// also useful to the roles that generate the underlying data.
const MANAGEMENT = [...ADMIN_ROLES] as const;

router.use(authenticate);

router.get(
  '/leads',
  authorize(...MANAGEMENT, Role.COUNSELOR, Role.MARKETING_TEAM),
  validate({ query: dateRangeQuerySchema }),
  dashboardController.getLeadsSummary,
);
router.get(
  '/revenue',
  authorize(...MANAGEMENT, Role.ACCOUNTANT),
  validate({ query: dateRangeQuerySchema }),
  dashboardController.getRevenueSummary,
);
router.get(
  '/appointments',
  authorize(...MANAGEMENT, Role.RECEPTIONIST),
  validate({ query: dateRangeQuerySchema }),
  dashboardController.getAppointmentStats,
);
router.get(
  '/inventory',
  authorize(...MANAGEMENT, Role.INVENTORY_MANAGER),
  dashboardController.getInventoryOverview,
);
router.get(
  '/top-treatments',
  authorize(...MANAGEMENT),
  validate({ query: topTreatmentsQuerySchema }),
  dashboardController.getTopTreatments,
);
router.get(
  '/counselor-performance',
  authorize(...MANAGEMENT),
  validate({ query: dateRangeQuerySchema }),
  dashboardController.getCounselorPerformance,
);
router.get(
  '/campaign-performance',
  authorize(...MANAGEMENT, Role.MARKETING_TEAM),
  validate({ query: dateRangeQuerySchema }),
  dashboardController.getCampaignPerformance,
);

export default router;
