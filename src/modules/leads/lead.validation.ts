import { Gender, LeadSource, LeadStatus } from '@prisma/client';
import { z } from 'zod';
import {
  mobileNumberSchema,
  paginationSchema,
  personNameSchema,
  uuidParamSchema,
} from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const createLeadSchema = z.object({
  fullName: personNameSchema,
  mobileNumber: mobileNumberSchema,
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  interestedTreatmentId: z.string().uuid().optional(),
  source: z.nativeEnum(LeadSource),
  campaignId: z.string().uuid().optional(),
  assignedCounselorId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z
  .object({
    fullName: personNameSchema.optional(),
    mobileNumber: mobileNumberSchema.optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    interestedTreatmentId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
    assignedCounselorId: z.string().uuid().optional(),
    nextFollowUpAt: z.coerce.date().optional(),
    leadScore: z.coerce.number().int().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// Status transitions are intentionally not validated as a strict linear
// pipeline here (counselors move leads non-linearly in practice) — the only
// hard rule, enforced in lead.service.ts, is that CONVERTED is reachable only
// through the dedicated /convert endpoint, and is a one-way, terminal state.
export const changeLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  notes: z.string().trim().max(1000).optional(),
});
export type ChangeLeadStatusInput = z.infer<typeof changeLeadStatusSchema>;

export const listLeadsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  assignedCounselorId: z.string().uuid().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

// Fields required to create the Patient record at conversion time — a Lead
// doesn't carry gender/DOB/city/state, so these must be supplied then. Name,
// mobile, and email fall back to the lead's values when omitted.
export const convertLeadSchema = z
  .object({
    fullName: personNameSchema.optional(),
    mobileNumber: mobileNumberSchema.optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    gender: z.nativeEnum(Gender),
    dateOfBirth: z.coerce.date().optional(),
    age: z.coerce.number().int().min(0).max(150).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
  })
  .refine((data) => data.dateOfBirth !== undefined || data.age !== undefined, {
    message: 'Either dateOfBirth or age must be provided',
    path: ['dateOfBirth'],
  });
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

// Public, unauthenticated lead-capture endpoint used by the website contact
// form — see marketing.routes.ts for the ad-platform webhook equivalents.
export const capturePublicLeadSchema = z.object({
  fullName: personNameSchema,
  mobileNumber: mobileNumberSchema,
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  interestedTreatmentId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
  utmSource: z.string().trim().max(150).optional(),
  utmMedium: z.string().trim().max(150).optional(),
  utmCampaign: z.string().trim().max(150).optional(),
});
export type CapturePublicLeadInput = z.infer<typeof capturePublicLeadSchema>;
