import { LeadSource } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  source: z.nativeEnum(LeadSource),
  adSet: z.string().trim().max(150).optional(),
  ad: z.string().trim().max(150).optional(),
  keyword: z.string().trim().max(150).optional(),
  landingPage: z.string().trim().max(500).optional(),
  utmSource: z.string().trim().max(150).optional(),
  utmMedium: z.string().trim().max(150).optional(),
  utmCampaign: z.string().trim().max(150).optional(),
  utmTerm: z.string().trim().max(150).optional(),
  utmContent: z.string().trim().max(150).optional(),
  costPerLead: z.coerce.number().nonnegative().max(1_000_000).optional(),
  totalSpend: z.coerce.number().nonnegative().max(100_000_000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    adSet: z.string().trim().max(150).optional(),
    ad: z.string().trim().max(150).optional(),
    keyword: z.string().trim().max(150).optional(),
    landingPage: z.string().trim().max(500).optional(),
    costPerLead: z.coerce.number().nonnegative().max(1_000_000).optional(),
    totalSpend: z.coerce.number().nonnegative().max(100_000_000).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const listCampaignsQuerySchema = paginationSchema.extend({
  source: z.nativeEnum(LeadSource).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
