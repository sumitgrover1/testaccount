import { EmploymentType, LoanApplicationStatus, VehicleType } from '@prisma/client';
import { z } from 'zod';
import { contactSchema } from '../leads/lead.validation';

export const emiSchema = z.object({
  principal: z.coerce.number().int().min(10_000).max(100_000_000),
  interestRate: z.coerce.number().min(0.1).max(36),
  tenureMonths: z.coerce.number().int().min(3).max(120),
  includeSchedule: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const listOffersQuerySchema = z.object({
  vehicleType: z.nativeEnum(VehicleType).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const eligibilitySchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
  vehiclePrice: z.coerce.number().int().min(10_000),
  downPayment: z.coerce.number().int().min(0),
  tenureMonths: z.coerce.number().int().min(6).max(120),
  monthlyIncome: z.coerce.number().int().min(1_000),
  existingEmi: z.coerce.number().int().min(0).default(0),
  employmentType: z.nativeEnum(EmploymentType),
  age: z.coerce.number().int().min(18).max(80),
  creditScore: z.coerce.number().int().min(300).max(900).optional(),
});

export const applySchema = eligibilitySchema.extend({
  contact: contactSchema,
  offerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  panLast4: z.string().regex(/^\d{4}$/).optional(),
});

export const listApplicationsQuerySchema = z.object({
  status: z.nativeEnum(LoanApplicationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const updateApplicationSchema = z.object({
  status: z.nativeEnum(LoanApplicationStatus),
  rejectionReason: z.string().trim().max(500).optional(),
});
