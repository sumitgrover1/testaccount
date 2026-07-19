'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Pencil } from 'lucide-react';
import * as treatmentsApi from '@/lib/api/treatments';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/format';
import type { Treatment } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  description: z.string().optional(),
  defaultPrice: z.coerce.number().nonnegative(),
  durationMinutes: z.coerce.number().int().positive(),
  numberOfSessions: z.coerce.number().int().positive().default(1),
});
type FormValues = z.infer<typeof schema>;

function TreatmentFormModal({
  open,
  onClose,
  treatment,
}: {
  open: boolean;
  onClose: () => void;
  treatment?: Treatment;
}) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: treatment
      ? {
          name: treatment.name,
          category: treatment.category,
          description: treatment.description ?? '',
          defaultPrice: Number(treatment.defaultPrice),
          durationMinutes: treatment.durationMinutes,
          numberOfSessions: treatment.numberOfSessions,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      treatment ? treatmentsApi.updateTreatment(treatment.id, values) : treatmentsApi.createTreatment(values),
    onSuccess: () => {
      showSuccess(treatment ? 'Treatment updated' : 'Treatment created');
      void queryClient.invalidateQueries({ queryKey: ['treatments'] });
      reset();
      onClose();
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to save treatment')),
  });

  return (
    <Modal open={open} onClose={onClose} title={treatment ? 'Edit treatment' : 'New treatment'}>
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Category" error={errors.category?.message} {...register('category')} />
          <Input label="Default price (₹)" type="number" step="0.01" error={errors.defaultPrice?.message} {...register('defaultPrice')} />
          <Input label="Duration (minutes)" type="number" error={errors.durationMinutes?.message} {...register('durationMinutes')} />
          <Input label="Number of sessions" type="number" error={errors.numberOfSessions?.message} {...register('numberOfSessions')} />
        </div>
        <Textarea label="Description" {...register('description')} />
        <div className="flex justify-end">
          <Button type="submit" isLoading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TreatmentsPage() {
  const [formTreatment, setFormTreatment] = useState<Treatment | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => treatmentsApi.listTreatments({ limit: 100 }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => treatmentsApi.updateTreatment(id, { isActive }),
    onSuccess: () => {
      showSuccess('Treatment updated');
      void queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
    onError: (err) => showError(getApiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Treatments"
        description="Service catalog"
        action={
          <Button
            onClick={() => {
              setFormTreatment(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New Treatment
          </Button>
        }
      />

      <Card>
        <Table
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Category', accessor: (r) => r.category },
            { header: 'Price', accessor: (r) => formatCurrency(r.defaultPrice) },
            { header: 'Duration', accessor: (r) => `${r.durationMinutes} min` },
            { header: 'Sessions', accessor: (r) => r.numberOfSessions },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            {
              header: '',
              accessor: (r) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormTreatment(r);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActiveMutation.mutate({ id: r.id, isActive: !r.isActive })}>
                    {r.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ),
            },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No treatments yet"
        />
      </Card>

      <TreatmentFormModal open={formOpen} onClose={() => setFormOpen(false)} treatment={formTreatment} />
    </div>
  );
}
