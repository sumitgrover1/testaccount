'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as inventoryApi from '@/lib/api/inventory';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';

interface FormValues {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
}

export function SuppliersTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ['inventory', 'suppliers'], queryFn: () => inventoryApi.listSuppliers({ limit: 100 }) });
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.createSupplier({
        name: values.name,
        contactPerson: values.contactPerson || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        gstNumber: values.gstNumber || undefined,
      }),
    onSuccess: () => {
      showSuccess('Supplier created');
      reset();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'suppliers'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create supplier')),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Supplier
        </Button>
      </div>
      <Card>
        <Table
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Contact', accessor: (r) => r.contactPerson ?? '—' },
            { header: 'Phone', accessor: (r) => r.phone ?? '—' },
            { header: 'GST', accessor: (r) => r.gstNumber ?? '—' },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No suppliers yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New supplier">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" {...register('name', { required: true })} />
            <Input label="Contact person" {...register('contactPerson')} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} />
            <Input label="GST number" {...register('gstNumber')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={createMutation.isPending}>
              Save supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
