import { Role } from '@prisma/client';
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});
export type IdParam = z.infer<typeof idParamSchema>;

const name = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[\p{L} .'-]+$/u, 'Name contains invalid characters');

export const updateProfileSchema = z
  .object({
    firstName: name.optional(),
    lastName: name.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.nativeEnum(Role).optional(),
  search: z.string().trim().max(254).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Role and active-state changes are privileged operations restricted to admins;
// deliberately kept out of updateProfileSchema so a regular user can never
// self-escalate by sending extra fields (validate.middleware strips unknowns too).
export const updateUserAdminSchema = z
  .object({
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateUserAdminInput = z.infer<typeof updateUserAdminSchema>;
