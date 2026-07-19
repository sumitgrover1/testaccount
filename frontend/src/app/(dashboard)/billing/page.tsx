'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { InvoicesTab } from './_components/InvoicesTab';
import { CouponsTab } from './_components/CouponsTab';

export default function BillingPage() {
  return (
    <div>
      <PageHeader title="Billing" description="Invoices, payments, and coupons" />
      <Tabs tabs={[{ label: 'Invoices', content: <InvoicesTab /> }, { label: 'Coupons', content: <CouponsTab /> }]} />
    </div>
  );
}
