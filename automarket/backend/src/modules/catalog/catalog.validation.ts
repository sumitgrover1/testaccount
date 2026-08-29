import { FuelType, ModelStatus, Transmission, VehicleType } from '@prisma/client';
import { z } from 'zod';

const csv = <T extends string>(values: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter((s): s is T => (values as readonly string[]).includes(s))
        : undefined,
    );

export const vehicleTypeParamSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
});

export const listBrandsQuerySchema = z.object({
  vehicleType: z.nativeEnum(VehicleType).optional(),
  popular: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const listModelsQuerySchema = z.object({
  vehicleType: z.nativeEnum(VehicleType).optional(),
  brand: z.string().trim().max(80).optional(),
  q: z.string().trim().max(80).optional(),
  status: z.nativeEnum(ModelStatus).optional(),
  bodyType: z.string().trim().max(40).optional(),
  fuelTypes: csv(Object.values(FuelType)),
  transmissions: csv(Object.values(Transmission)),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minSeating: z.coerce.number().int().min(1).max(100).optional(),
  sort: z
    .enum(['popular', 'price-asc', 'price-desc', 'newest', 'mileage', 'name'])
    .default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const modelPathParamSchema = z.object({
  brandSlug: z.string().min(1).max(80),
  modelSlug: z.string().min(1).max(120),
});

export const compareQuerySchema = z.object({
  variantIds: z
    .string()
    .min(1)
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
    // Comparison tables stay readable up to four columns, and the cap also
    // bounds the fan-out of the spec query behind it.
    .refine((ids) => ids.length >= 2 && ids.length <= 4, {
      message: 'Provide between 2 and 4 variant ids',
    }),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
