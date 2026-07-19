import { EnrollmentStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const itemIdParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
  itemId: z.string().uuid('Invalid itemId'),
});
export type ItemIdParam = z.infer<typeof itemIdParamSchema>;

const enrollmentItemSchema = z.object({
  treatmentId: z.string().uuid(),
  sessionsTotal: z.coerce.number().int().positive().max(365).optional(),
  price: z.coerce.number().nonnegative().max(10_000_000).optional(),
});

// A patient enrolls in either a package (all its treatments are pulled in
// automatically) or an explicit list of one-or-more treatments — never both,
// and never neither.
export const createEnrollmentSchema = z
  .object({
    patientId: z.string().uuid(),
    assignedDoctorId: z.string().uuid(),
    assignedTherapistId: z.string().uuid().optional(),
    packageId: z.string().uuid().optional(),
    items: z.array(enrollmentItemSchema).optional(),
    expiryDate: z.coerce.date().optional(),
  })
  .refine((data) => Boolean(data.packageId) !== Boolean(data.items?.length), {
    message: 'Provide either packageId or a non-empty items array, not both',
    path: ['packageId'],
  });
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export const updateEnrollmentStatusSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus),
});
export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>;

export const recordSessionSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RecordSessionInput = z.infer<typeof recordSessionSchema>;

export const listEnrollmentsQuerySchema = paginationSchema.extend({
  patientId: z.string().uuid().optional(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
  assignedDoctorId: z.string().uuid().optional(),
});
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
