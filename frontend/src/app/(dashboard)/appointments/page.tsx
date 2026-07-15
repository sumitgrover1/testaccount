'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as appointmentsApi from '@/lib/api/appointments';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import { AppointmentForm } from './_components/AppointmentForm';
import type { Appointment, AppointmentStatus } from '@/types';

const STATUS_OPTIONS = [
  { label: 'Booked', value: 'BOOKED' },
  { label: 'Checked In', value: 'CHECKED_IN' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'No Show', value: 'NO_SHOW' },
  { label: 'Rescheduled', value: 'RESCHEDULED' },
];

function ActionButtons({ appointment }: { appointment: Appointment }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] });
  const onError = (err: unknown) => showError(getApiErrorMessage(err, 'Action failed'));

  const checkIn = useMutation({
    mutationFn: () => appointmentsApi.checkInAppointment(appointment.id),
    onSuccess: () => {
      showSuccess('Checked in');
      void invalidate();
    },
    onError,
  });
  const complete = useMutation({
    mutationFn: () => appointmentsApi.completeAppointment(appointment.id),
    onSuccess: () => {
      showSuccess('Marked completed');
      void invalidate();
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: () => appointmentsApi.cancelAppointment(appointment.id),
    onSuccess: () => {
      showSuccess('Cancelled');
      void invalidate();
    },
    onError,
  });
  const noShow = useMutation({
    mutationFn: () => appointmentsApi.markNoShow(appointment.id),
    onSuccess: () => {
      showSuccess('Marked as no-show');
      void invalidate();
    },
    onError,
  });

  if (appointment.status === 'BOOKED') {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => checkIn.mutate()} isLoading={checkIn.isPending}>
          Check in
        </Button>
        <Button size="sm" variant="ghost" onClick={() => noShow.mutate()} isLoading={noShow.isPending}>
          No-show
        </Button>
        <Button size="sm" variant="danger" onClick={() => cancel.mutate()} isLoading={cancel.isPending}>
          Cancel
        </Button>
      </div>
    );
  }
  if (appointment.status === 'CHECKED_IN') {
    return (
      <Button size="sm" onClick={() => complete.mutate()} isLoading={complete.isPending}>
        Mark completed
      </Button>
    );
  }
  return null;
}

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', { page, status }],
    queryFn: () => appointmentsApi.listAppointments({ page, limit: 20, status: status || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: appointmentsApi.createAppointment,
    onSuccess: () => {
      showSuccess('Appointment booked');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to book appointment')),
  });

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Scheduling and check-in"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as AppointmentStatus | '');
          }}
        />
      </div>

      <Card>
        <Table
          columns={[
            { header: 'Patient', accessor: (r) => r.patient?.fullName ?? '—' },
            { header: 'Doctor', accessor: (r) => (r.doctor ? `${r.doctor.firstName} ${r.doctor.lastName}` : '—') },
            { header: 'Treatment', accessor: (r) => r.treatment?.name ?? '—' },
            { header: 'When', accessor: (r) => formatDateTime(r.scheduledDate) },
            { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
            { header: 'Actions', accessor: (r) => <ActionButtons appointment={r} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No appointments yet"
        />
        {data && (
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New appointment">
        <AppointmentForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
