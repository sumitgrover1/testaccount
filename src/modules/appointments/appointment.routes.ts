import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as appointmentController from './appointment.controller';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  idParamSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  updateAppointmentSchema,
} from './appointment.validation';

const router = Router();

const SCHEDULERS = [...ADMIN_ROLES, Role.RECEPTIONIST, Role.COUNSELOR, Role.DOCTOR] as const;

router.use(authenticate);

router.post(
  '/',
  authorize(...SCHEDULERS),
  validate({ body: createAppointmentSchema }),
  appointmentController.createAppointment,
);
router.get(
  '/',
  authorize(...SCHEDULERS),
  validate({ query: listAppointmentsQuerySchema }),
  appointmentController.listAppointments,
);
router.get(
  '/:id',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema }),
  appointmentController.getAppointment,
);
router.patch(
  '/:id',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema, body: updateAppointmentSchema }),
  appointmentController.updateAppointment,
);
router.post(
  '/:id/check-in',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema }),
  appointmentController.checkInAppointment,
);
router.post(
  '/:id/complete',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema }),
  appointmentController.completeAppointment,
);
router.post(
  '/:id/cancel',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema, body: cancelAppointmentSchema }),
  appointmentController.cancelAppointment,
);
router.post(
  '/:id/no-show',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema }),
  appointmentController.markNoShow,
);
router.post(
  '/:id/reschedule',
  authorize(...SCHEDULERS),
  validate({ params: idParamSchema, body: rescheduleAppointmentSchema }),
  appointmentController.rescheduleAppointment,
);

export default router;
