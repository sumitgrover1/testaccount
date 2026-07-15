'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as billingApi from '@/lib/api/billing';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { InvoiceForm } from './InvoiceForm';

export function InvoicesTab() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'invoices', { page }],
    queryFn: () => billingApi.listInvoices({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: billingApi.createInvoice,
    onSuccess: () => {
      showSuccess('Invoice created');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create invoice')),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>
      <Card>
        <Table
          columns={[
            { header: 'Invoice #', accessor: (r) => r.invoiceNumber },
            { header: 'Date', accessor: (r) => formatDate(r.createdAt) },
            { header: 'Subtotal', accessor: (r) => formatCurrency(r.subtotal) },
            { header: 'Discount', accessor: (r) => formatCurrency(r.discountAmount) },
            { header: 'Total', accessor: (r) => formatCurrency(r.totalAmount) },
            { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => router.push(`/billing/invoices/${r.id}`)}
          emptyMessage="No invoices yet"
        />
        {data && (
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New invoice" size="lg">
        <InvoiceForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
