'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as patientsApi from '@/lib/api/patients';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/format';
import { PatientForm } from './_components/PatientForm';

export default function PatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { page, search }],
    queryFn: () => patientsApi.listPatients({ page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: patientsApi.createPatient,
    onSuccess: () => {
      showSuccess('Patient created');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create patient')),
  });

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Centralized patient profiles"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Patient
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name, mobile, or email"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      <Card>
        <Table
          columns={[
            { header: 'Patient ID', accessor: (r) => r.patientCode },
            { header: 'Name', accessor: (r) => r.fullName },
            { header: 'Mobile', accessor: (r) => r.mobileNumber },
            { header: 'City', accessor: (r) => `${r.city}, ${r.state}` },
            { header: 'Registered', accessor: (r) => formatDate(r.createdAt) },
            { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => router.push(`/patients/${r.id}`)}
          emptyMessage="No patients yet — create the first one"
        />
        {data && (
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New patient" size="lg">
        <PatientForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
