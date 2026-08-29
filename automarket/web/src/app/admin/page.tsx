import type { Metadata } from 'next';
import { AdminConsole } from '@/components/AdminConsole';

export const metadata: Metadata = {
  title: 'Sales console',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="container-page py-8">
      <AdminConsole />
    </div>
  );
}
