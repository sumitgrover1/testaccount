import { ProtectedShell } from '@/components/layout/ProtectedShell';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
