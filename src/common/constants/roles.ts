export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_OWNER: 'CLINIC_OWNER',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  COUNSELOR: 'COUNSELOR',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  MARKETING_TEAM: 'MARKETING_TEAM',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/// Roles with unrestricted administrative access (staff management, pricing
/// overrides requiring approval, system configuration).
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.CLINIC_OWNER] as const;

/// Roles allowed to approve below-threshold pricing requests.
export const PRICING_APPROVER_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.CLINIC_OWNER,
  ROLES.DOCTOR,
] as const;
