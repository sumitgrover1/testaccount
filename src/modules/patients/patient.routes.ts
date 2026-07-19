import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as patientController from './patient.controller';
import {
  addPatientDocumentSchema,
  createPatientSchema,
  idParamSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from './patient.validation';

const router = Router();

const CLINICAL_STAFF = [
  Role.SUPER_ADMIN,
  Role.CLINIC_OWNER,
  Role.DOCTOR,
  Role.RECEPTIONIST,
  Role.COUNSELOR,
] as const;
// Accountants need read access to patients for billing, but never write access.
const PATIENT_READERS = [...CLINICAL_STAFF, Role.ACCOUNTANT] as const;

router.use(authenticate);

router.post(
  '/',
  authorize(...CLINICAL_STAFF),
  validate({ body: createPatientSchema }),
  patientController.createPatient,
);
router.get(
  '/',
  authorize(...PATIENT_READERS),
  validate({ query: listPatientsQuerySchema }),
  patientController.listPatients,
);
router.get(
  '/:id',
  authorize(...PATIENT_READERS),
  validate({ params: idParamSchema }),
  patientController.getPatient,
);
router.patch(
  '/:id',
  authorize(...CLINICAL_STAFF),
  validate({ params: idParamSchema, body: updatePatientSchema }),
  patientController.updatePatient,
);

router.get(
  '/:id/documents',
  authorize(...CLINICAL_STAFF),
  validate({ params: idParamSchema }),
  patientController.listPatientDocuments,
);
router.post(
  '/:id/documents',
  authorize(...CLINICAL_STAFF),
  validate({ params: idParamSchema, body: addPatientDocumentSchema }),
  patientController.addPatientDocument,
);

export default router;
