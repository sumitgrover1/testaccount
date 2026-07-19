import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as treatmentController from './treatment.controller';
import {
  createTreatmentSchema,
  idParamSchema,
  listTreatmentsQuerySchema,
  updateTreatmentSchema,
} from './treatment.validation';

const router = Router();

const TREATMENT_MANAGERS = [...ADMIN_ROLES, Role.DOCTOR] as const;

// Public, unauthenticated catalog listing consumed by the marketing website's
// Services page. Registered before authenticate so it stays open; mounted
// ahead of the /:id route below so it can never be shadowed by it.
router.get('/public-list', treatmentController.listPublicTreatments);

router.use(authenticate);

router.post(
  '/',
  authorize(...TREATMENT_MANAGERS),
  validate({ body: createTreatmentSchema }),
  treatmentController.createTreatment,
);
router.get('/', validate({ query: listTreatmentsQuerySchema }), treatmentController.listTreatments);
router.get('/:id', validate({ params: idParamSchema }), treatmentController.getTreatment);
router.get(
  '/:id/price-history',
  authorize(...TREATMENT_MANAGERS, Role.ACCOUNTANT),
  validate({ params: idParamSchema }),
  treatmentController.getTreatmentPriceHistory,
);
router.patch(
  '/:id',
  authorize(...TREATMENT_MANAGERS),
  validate({ params: idParamSchema, body: updateTreatmentSchema }),
  treatmentController.updateTreatment,
);

export default router;
