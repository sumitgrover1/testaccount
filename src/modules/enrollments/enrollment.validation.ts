import { EnrollmentStatus } from '@prisma/client';
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});
export type IdParam = z.infer<typeof idParamSchema>;

export const enrollSchema = z.object({
  courseId: z.string().uuid('Invalid courseId'),
});
export type EnrollInput = z.infer<typeof enrollSchema>;

export const updateEnrollmentStatusSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus),
});
export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>;

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  courseId: z.string().uuid().optional(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
});
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
