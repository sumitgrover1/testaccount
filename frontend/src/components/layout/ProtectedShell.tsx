'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <FullPageSpinner />;
  }

  return (
    // print: overrides undo the fixed-viewport screen layout (h-screen +
    // overflow-hidden clip anything beyond one screen's height, which would
    // cut off a multi-page printable view like an invoice) and hide the
    // sidebar/topbar chrome, leaving only whatever the page marks
    // `print:block` (see e.g. billing/invoices/[id]/page.tsx).
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 print:overflow-visible print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
