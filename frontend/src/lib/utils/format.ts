import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLINIC_OWNER: 'Clinic Owner',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  COUNSELOR: 'Counselor',
  INVENTORY_MANAGER: 'Inventory Manager',
  ACCOUNTANT: 'Accountant',
  MARKETING_TEAM: 'Marketing Team',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? titleCase(role);
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-200 text-slate-600',
  PENDING: 'bg-amber-100 text-amber-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  BOOKED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-indigo-100 text-indigo-700',
  NO_SHOW: 'bg-rose-100 text-rose-700',
  RESCHEDULED: 'bg-amber-100 text-amber-700',
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-indigo-100 text-indigo-700',
  INTERESTED: 'bg-violet-100 text-violet-700',
  CONSULTATION_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  VISITED_CLINIC: 'bg-teal-100 text-teal-700',
  TREATMENT_DISCUSSION: 'bg-teal-100 text-teal-700',
  HOT_LEAD: 'bg-orange-100 text-orange-700',
  PACKAGE_SHARED: 'bg-orange-100 text-orange-700',
  CONVERTED: 'bg-emerald-100 text-emerald-700',
  COLD: 'bg-slate-200 text-slate-600',
  LOST: 'bg-rose-100 text-rose-700',
  DUPLICATE: 'bg-slate-200 text-slate-600',
  INVALID: 'bg-rose-100 text-rose-700',
  NO_RESPONSE: 'bg-slate-200 text-slate-600',
  DRAFT: 'bg-slate-200 text-slate-600',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  REFUNDED: 'bg-slate-200 text-slate-600',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  MISSED: 'bg-rose-100 text-rose-700',
  PROCESSED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  MANUALLY_CORRECTED: 'bg-blue-100 text-blue-700',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-slate-200 text-slate-600';
}
