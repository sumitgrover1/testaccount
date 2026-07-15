'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as usersApi from '@/lib/api/users';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { roleLabel } from '@/lib/utils/format';
import type { Role } from '@/types';

const ROLE_OPTIONS = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Clinic Owner', value: 'CLINIC_OWNER' },
  { label: 'Doctor', value: 'DOCTOR' },
  { label: 'Receptionist', value: 'RECEPTIONIST' },
  { label: 'Counselor', value: 'COUNSELOR' },
  { label: 'Inventory Manager', value: 'INVENTORY_MANAGER' },
  { label: 'Accountant', value: 'ACCOUNTANT' },
  { label: 'Marketing Team', value: 'MARKETING_TEAM' },
];

interface FormValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ['users', 'staff'], queryFn: () => usersApi.listUsers({ limit: 100 }) });
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { role: 'RECEPTIONIST' } });

  const createMutation = useMutation({
    mutationFn: usersApi.createStaffUser,
    onSuccess: () => {
      showSuccess('Staff account created');
      reset();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['users', 'staff'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create staff account')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.updateUserAsAdmin(id, { isActive }),
    onSuccess: () => {
      showSuccess('Updated');
      void queryClient.invalidateQueries({ queryKey: ['users', 'staff'] });
    },
    onError: (err) => showError(getApiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Clinic team accounts"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Staff Member
          </Button>
        }
      />

      <Card>
        <Table
          columns={[
            { header: 'Name', accessor: (r) => `${r.firstName} ${r.lastName}` },
            { header: 'Email', accessor: (r) => r.email },
            { header: 'Role', accessor: (r) => roleLabel(r.role) },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            {
              header: '',
              accessor: (r) => (
                <Button size="sm" variant="secondary" onClick={() => toggleActiveMutation.mutate({ id: r.id, isActive: !r.isActive })}>
                  {r.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              ),
            },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No staff accounts yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New staff member">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" {...register('firstName', { required: true })} />
            <Input label="Last name" {...register('lastName', { required: true })} />
            <Input label="Email" type="email" {...register('email', { required: true })} />
            <Input label="Temporary password" type="password" {...register('password', { required: true })} />
            <Select label="Role" options={ROLE_OPTIONS} {...register('role')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={createMutation.isPending}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
