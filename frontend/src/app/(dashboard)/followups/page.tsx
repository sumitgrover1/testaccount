'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as followupsApi from '@/lib/api/followups';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import { FollowUpForm, type FollowUpFormOutput } from './_components/FollowUpForm';
import type { FollowUpStatus } from '@/types';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Done', value: 'DONE' },
  { label: 'Missed', value: 'MISSED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function FollowUpsPage() {
  const [status, setStatus] = useState<FollowUpStatus | ''>('PENDING');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['followups', { status }],
    queryFn: () => followupsApi.listFollowUps({ limit: 50, status: status || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['followups'] });

  const createMutation = useMutation({
    mutationFn: (values: FollowUpFormOutput) => followupsApi.createFollowUp(values),
    onSuccess: () => {
      showSuccess('Follow-up created');
      setCreateOpen(false);
      void invalidate();
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create follow-up')),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => followupsApi.completeFollowUp(id),
    onSuccess: () => {
      showSuccess('Marked complete');
      void invalidate();
    },
    onError: (err) => showError(getApiErrorMessage(err)),
  });

  const reminderMutation = useMutation({
    mutationFn: (id: string) => followupsApi.sendReminder(id),
    onSuccess: () => showSuccess('Reminder sent'),
    onError: (err) => showError(getApiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Never miss a lead or patient touchpoint"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Follow-up
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value as FollowUpStatus | '')} />
      </div>

      <Card>
        <Table
          columns={[
            { header: 'For', accessor: (r) => r.lead?.fullName ?? r.patient?.fullName ?? '—' },
            { header: 'Assigned to', accessor: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : '—') },
            { header: 'Channel', accessor: (r) => r.channel },
            { header: 'Due', accessor: (r) => formatDateTime(r.dueAt) },
            { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
            {
              header: '',
              accessor: (r) =>
                r.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => completeMutation.mutate(r.id)}>
                      Complete
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => reminderMutation.mutate(r.id)}>
                      Send reminder
                    </Button>
                  </div>
                ) : null,
            },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No follow-ups"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New follow-up">
        <FollowUpForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
