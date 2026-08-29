import { InsuranceApplicationStatus, PolicyType, VehicleType } from '@prisma/client';
import { z } from 'zod';
import { contactSchema } from '../leads/lead.validation';

const currentYear = new Date().getFullYear();

export const listInsurersQuerySchema = z.object({
  vehicleType: z.nativeEnum(VehicleType).optional(),
});

export const listAddOnsQuerySchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
});

export const quoteSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
  policyType: z.nativeEnum(PolicyType).default('COMPREHENSIVE'),
  modelId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  // Either a catalogue variant (which supplies the ex-showroom price and cc)
  // or a manual valuation for a vehicle that is not in the catalogue.
  vehicleValue: z.coerce.number().int().min(20_000).optional(),
  engineCc: z.coerce.number().int().min(25).max(20_000).optional(),
  registrationYear: z.coerce.number().int().min(1990).max(currentYear),
  registrationNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/, 'Enter a valid registration number')
    .optional(),
  isNewVehicle: z.boolean().default(false),
  ncbPercent: z.coerce.number().min(0).max(50).default(0),
  claimedLastYear: z.boolean().default(false),
  previousPolicyExpiry: z.coerce.date().optional(),
  addOnSlugs: z.array(z.string().trim().max(60)).max(10).default([]),
  idv: z.coerce.number().int().min(10_000).optional(),
});

export const applySchema = quoteSchema.extend({
  planId: z.string().uuid(),
  contact: contactSchema,
});

export const listApplicationsQuerySchema = z.object({
  status: z.nativeEnum(InsuranceApplicationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const updateApplicationSchema = z.object({
  status: z.nativeEnum(InsuranceApplicationStatus),
});
