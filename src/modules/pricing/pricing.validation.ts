import { PricingApprovalStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const setPatientTreatmentPriceSchema = z.object({
  patientId: z.string().uuid(),
  treatmentId: z.string().uuid(),
  price: z.coerce.number().nonnegative().max(10_000_000),
  reason: z.string().trim().max(500).optional(),
});
export type SetPatientTreatmentPriceInput = z.infer<typeof setPatientTreatmentPriceSchema>;

export const reviewPricingRequestSchema = z.object({
  decision: z.enum([PricingApprovalStatus.APPROVED, PricingApprovalStatus.REJECTED]),
  reason: z.string().trim().max(500).optional(),
});
export type ReviewPricingRequestInput = z.infer<typeof reviewPricingRequestSchema>;

export const listPricingRequestsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(PricingApprovalStatus).optional(),
  patientId: z.string().uuid().optional(),
});
export type ListPricingRequestsQuery = z.infer<typeof listPricingRequestsQuerySchema>;

export const getEffectivePriceQuerySchema = z.object({
  patientId: z.string().uuid(),
  treatmentId: z.string().uuid(),
});
export type GetEffectivePriceQuery = z.infer<typeof getEffectivePriceQuerySchema>;
