import {
  LayoutDashboard,
  UserRound,
  ContactRound,
  Stethoscope,
  Package,
  Tags,
  ClipboardCheck,
  CalendarClock,
  Warehouse,
  CreditCard,
  Megaphone,
  ListTodo,
  MessagesSquare,
  ShieldCheck,
  Newspaper,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Patients',
    href: '/patients',
    icon: UserRound,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'COUNSELOR', 'ACCOUNTANT'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: ContactRound,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'COUNSELOR', 'RECEPTIONIST', 'MARKETING_TEAM', 'DOCTOR'],
  },
  { label: 'Treatments', href: '/treatments', icon: Stethoscope },
  { label: 'Packages', href: '/packages', icon: Package },
  {
    label: 'Pricing',
    href: '/pricing',
    icon: Tags,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'COUNSELOR', 'RECEPTIONIST', 'ACCOUNTANT'],
  },
  {
    label: 'Enrollments',
    href: '/enrollments',
    icon: ClipboardCheck,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'COUNSELOR', 'ACCOUNTANT'],
  },
  {
    label: 'Appointments',
    href: '/appointments',
    icon: CalendarClock,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'RECEPTIONIST', 'COUNSELOR', 'DOCTOR'],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: Warehouse,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'INVENTORY_MANAGER', 'DOCTOR', 'ACCOUNTANT'],
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: CreditCard,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'ACCOUNTANT', 'RECEPTIONIST'],
  },
  {
    label: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'MARKETING_TEAM'],
  },
  {
    label: 'Blog',
    href: '/blog',
    icon: Newspaper,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'MARKETING_TEAM'],
  },
  {
    label: 'Follow-ups',
    href: '/followups',
    icon: ListTodo,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER', 'COUNSELOR', 'RECEPTIONIST', 'MARKETING_TEAM'],
  },
  { label: 'Communications', href: '/communications', icon: MessagesSquare },
  {
    label: 'Staff',
    href: '/users',
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN', 'CLINIC_OWNER'],
  },
];

export function isNavItemVisible(item: NavItem, role: Role | undefined): boolean {
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}
