import { LeadStatus, LeadType, VehicleType } from '@prisma/client';
import { z } from 'zod';

// Indian mobile numbers, with or without the +91 / 0 prefix. Stored normalised
// to 10 digits so de-duplication across forms actually matches.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-()]/g, ''))
  .refine((v) => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number')
  .transform((v) => v.replace(/^(?:\+91|91|0)/, ''));

export const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: z.string().email().max(255).toLowerCase().optional(),
  citySlug: z.string().trim().max(80).optional(),
  consentToContact: z.boolean().default(true),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
});

export const createPublicLeadSchema = contactSchema.extend({
  type: z.nativeEnum(LeadType),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  modelId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  dealerId: z.string().uuid().optional(),
  message: z.string().trim().max(500).optional(),
  preferredCallTime: z.string().trim().max(40).optional(),
});

export const listLeadsQuerySchema = z.object({
  type: z.nativeEnum(LeadType).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  q: z.string().trim().max(80).optional(),
  assignedToId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const updateLeadSchema = z
  .object({
    status: z.nativeEnum(LeadStatus).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    dealerId: z.string().uuid().nullable().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');
