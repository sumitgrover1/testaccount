'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { ProductsTab } from './_components/ProductsTab';
import { SuppliersTab } from './_components/SuppliersTab';
import { PurchaseInvoicesTab } from './_components/PurchaseInvoicesTab';

export default function InventoryPage() {
  return (
    <div>
      <PageHeader title="Inventory" description="Products, batches, suppliers, and purchase entry" />
      <Tabs
        tabs={[
          { label: 'Products', content: <ProductsTab /> },
          { label: 'Suppliers', content: <SuppliersTab /> },
          { label: 'Purchase Invoices', content: <PurchaseInvoicesTab /> },
        ]}
      />
    </div>
  );
}
