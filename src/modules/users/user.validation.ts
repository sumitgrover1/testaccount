import { Role } from '@prisma/client';
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  personNameSchema,
  uuidParamSchema,
} from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const updateProfileSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
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

// Staff accounts are provisioned by an admin, not self-service — the role is
// mandatory and set explicitly here rather than defaulted, so there's never an
// ambiguous "no role yet" account.
export const createStaffSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  role: z.nativeEnum(Role),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

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
