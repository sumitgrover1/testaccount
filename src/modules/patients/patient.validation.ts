import { Gender, PatientDocumentType, PatientStatus } from '@prisma/client';
import { z } from 'zod';
import {
  mobileNumberSchema,
  paginationSchema,
  personNameSchema,
  uuidParamSchema,
} from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

const textField = (max: number) => z.string().trim().min(1).max(max);

const pincodeField = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid pincode')
  .optional();

const medicalInfoFields = {
  allergies: z.string().trim().max(2000).optional(),
  existingDiseases: z.string().trim().max(2000).optional(),
  currentMedication: z.string().trim().max(2000).optional(),
  previousTreatmentHistory: z.string().trim().max(4000).optional(),
};

const optionalFields = {
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  address: z.string().trim().max(500).optional(),
  occupation: z.string().trim().max(150).optional(),
  referralSource: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(2000).optional(),
};

export const createPatientSchema = z
  .object({
    fullName: personNameSchema,
    mobileNumber: mobileNumberSchema,
    gender: z.nativeEnum(Gender),
    dateOfBirth: z.coerce.date().optional(),
    age: z.coerce.number().int().min(0).max(150).optional(),
    city: textField(100),
    state: textField(100),
    pincode: pincodeField,
    ...optionalFields,
    ...medicalInfoFields,
  })
  .refine((data) => data.dateOfBirth !== undefined || data.age !== undefined, {
    message: 'Either dateOfBirth or age must be provided',
    path: ['dateOfBirth'],
  });
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = z
  .object({
    fullName: personNameSchema.optional(),
    mobileNumber: mobileNumberSchema.optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.coerce.date().optional(),
    age: z.coerce.number().int().min(0).max(150).optional(),
    city: textField(100).optional(),
    state: textField(100).optional(),
    pincode: pincodeField,
    status: z.nativeEnum(PatientStatus).optional(),
    ...optionalFields,
    ...medicalInfoFields,
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const listPatientsQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(150).optional(),
  status: z.nativeEnum(PatientStatus).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
});
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

export const addPatientDocumentSchema = z.object({
  type: z.nativeEnum(PatientDocumentType),
  fileUrl: z.string().trim().url().max(2048),
  fileName: textField(255),
  notes: z.string().trim().max(1000).optional(),
});
export type AddPatientDocumentInput = z.infer<typeof addPatientDocumentSchema>;
