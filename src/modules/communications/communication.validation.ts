import { CommunicationChannel, CommunicationDirection } from '@prisma/client';
import { z } from 'zod';
import { uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createCommunicationLogSchema = z
  .object({
    leadId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    channel: z.nativeEnum(CommunicationChannel),
    direction: z.nativeEnum(CommunicationDirection).default(CommunicationDirection.OUTBOUND),
    content: z.string().trim().max(4000).optional(),
  })
  .refine((data) => Boolean(data.leadId) !== Boolean(data.patientId), {
    message: 'Provide exactly one of leadId or patientId',
    path: ['leadId'],
  });
export type CreateCommunicationLogInput = z.infer<typeof createCommunicationLogSchema>;
