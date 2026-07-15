'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as enrollmentsApi from '@/lib/api/enrollments';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { EnrollmentForm } from './_components/EnrollmentForm';

export default function EnrollmentsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', { page }],
    queryFn: () => enrollmentsApi.listEnrollments({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: enrollmentsApi.createEnrollment,
    onSuccess: () => {
      showSuccess('Enrollment created');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create enrollment')),
  });

  return (
    <div>
      <PageHeader
        title="Treatment Enrollments"
        description="Patients enrolled in treatments and packages"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Enrollment
          </Button>
        }
      />

      <Card>
        <Table
          columns={[
            { header: 'Patient', accessor: (r) => r.patient?.fullName ?? '—' },
            { header: 'Package / Treatments', accessor: (r) => r.package?.name ?? r.items.map((i) => i.treatment.name).join(', ') },
            { header: 'Doctor', accessor: (r) => (r.assignedDoctor ? `${r.assignedDoctor.firstName} ${r.assignedDoctor.lastName}` : '—') },
            { header: 'Enrolled', accessor: (r) => formatDate(r.enrollmentDate) },
            { header: 'Total', accessor: (r) => formatCurrency(r.totalPrice) },
            { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => router.push(`/enrollments/${r.id}`)}
          emptyMessage="No enrollments yet"
        />
        {data && (
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New enrollment" size="lg">
        <EnrollmentForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
