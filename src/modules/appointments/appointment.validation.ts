import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  treatmentId: z.string().uuid().optional(),
  scheduledDate: z.coerce.date(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// Only permitted while the appointment is still BOOKED — see appointment.service.ts.
export const updateAppointmentSchema = z
  .object({
    doctorId: z.string().uuid().optional(),
    treatmentId: z.string().uuid().optional(),
    scheduledDate: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  scheduledDate: z.coerce.date(),
  doctorId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const listAppointmentsQuerySchema = paginationSchema.extend({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
