'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as billingApi from '@/lib/api/billing';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';

interface FormValues {
  code: string;
  discountPercent: string;
  discountAmount: string;
  maxUses: string;
}

export function CouponsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ['billing', 'coupons'], queryFn: () => billingApi.listCoupons({ limit: 100 }) });
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      billingApi.createCoupon({
        code: values.code,
        discountPercent: values.discountPercent ? Number(values.discountPercent) : undefined,
        discountAmount: values.discountAmount ? Number(values.discountAmount) : undefined,
        maxUses: values.maxUses ? Number(values.maxUses) : undefined,
      }),
    onSuccess: () => {
      showSuccess('Coupon created');
      reset();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['billing', 'coupons'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create coupon')),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Coupon
        </Button>
      </div>
      <Card>
        <Table
          columns={[
            { header: 'Code', accessor: (r) => r.code },
            { header: 'Discount', accessor: (r) => (r.discountPercent ? `${r.discountPercent}%` : `₹${r.discountAmount}`) },
            { header: 'Used', accessor: (r) => `${r.usedCount}${r.maxUses ? ` / ${r.maxUses}` : ''}` },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No coupons yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New coupon">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <Input label="Code" {...register('code', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Discount %" type="number" step="0.01" {...register('discountPercent')} />
            <Input label="Discount amount (₹)" type="number" step="0.01" {...register('discountAmount')} />
          </div>
          <Input label="Max uses (optional)" type="number" {...register('maxUses')} />
          <p className="text-xs text-slate-400">Provide either a percentage or a flat amount discount, not both.</p>
          <div className="flex justify-end">
            <Button type="submit" isLoading={createMutation.isPending}>
              Save coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
