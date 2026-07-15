'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as inventoryApi from '@/lib/api/inventory';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';

interface FormValues {
  supplierId: string;
  rawFileUrl: string;
  invoiceNumber: string;
}

export function PurchaseInvoicesTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'purchase-invoices'],
    queryFn: () => inventoryApi.listPurchaseInvoices({ limit: 50 }),
  });
  const { data: suppliers } = useQuery({ queryKey: ['inventory', 'suppliers', 'all'], queryFn: () => inventoryApi.listSuppliers({ limit: 200 }) });
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.createPurchaseInvoice({
        supplierId: values.supplierId || undefined,
        rawFileUrl: values.rawFileUrl,
        invoiceNumber: values.invoiceNumber || undefined,
      }),
    onSuccess: () => {
      showSuccess('Purchase invoice created — review extracted items');
      reset();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-invoices'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create purchase invoice')),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Purchase Invoice
        </Button>
      </div>
      <Card>
        <Table
          columns={[
            { header: 'Invoice #', accessor: (r) => r.invoiceNumber ?? '—' },
            { header: 'Supplier', accessor: (r) => r.supplier?.name ?? '—' },
            { header: 'Items', accessor: (r) => r.items.length },
            { header: 'OCR status', accessor: (r) => <Badge status={r.ocrStatus} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => router.push(`/inventory/purchase-invoices/${r.id}`)}
          emptyMessage="No purchase invoices yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New purchase invoice">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <Select
            label="Supplier (optional)"
            placeholder="Select supplier"
            options={(suppliers?.data ?? []).map((s) => ({ label: s.name, value: s.id }))}
            {...register('supplierId')}
          />
          <Input label="Invoice number (optional)" {...register('invoiceNumber')} />
          <Input label="Invoice file URL" placeholder="https://... (from your upload provider)" {...register('rawFileUrl', { required: true })} />
          <p className="text-xs text-slate-400">
            Upload the invoice file to your storage provider first, then paste its URL here. OCR will attempt extraction automatically —
            any unmatched fields can be corrected on the next screen.
          </p>
          <div className="flex justify-end">
            <Button type="submit" isLoading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
