import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../../common/utils/password';

const email = z.string().trim().toLowerCase().email().max(254);

// Length-based policy per NIST 800-63B; upper bound prevents hashing-DoS from
// pathologically long inputs.
const password = z.string().min(PASSWORD_MIN_LENGTH).max(128);

const name = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[\p{L} .'-]+$/u, 'Name contains invalid characters');

export const registerSchema = z.object({
  email,
  password,
  firstName: name,
  lastName: name,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
