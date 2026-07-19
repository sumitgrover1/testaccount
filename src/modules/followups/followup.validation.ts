import { FollowUpChannel, FollowUpStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createFollowUpSchema = z
  .object({
    leadId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    assignedToId: z.string().uuid(),
    channel: z.nativeEnum(FollowUpChannel),
    dueAt: z.coerce.date(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Boolean(data.leadId) !== Boolean(data.patientId), {
    message: 'Provide exactly one of leadId or patientId',
    path: ['leadId'],
  });
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

export const completeFollowUpSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;

export const escalateFollowUpSchema = z.object({
  escalatedToId: z.string().uuid(),
  notes: z.string().trim().max(1000).optional(),
});
export type EscalateFollowUpInput = z.infer<typeof escalateFollowUpSchema>;

export const listFollowUpsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(FollowUpStatus).optional(),
  assignedToId: z.string().uuid().optional(),
  overdue: z.coerce.boolean().optional(),
});
export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>;
