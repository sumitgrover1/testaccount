'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as leadsApi from '@/lib/api/leads';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { titleCase } from '@/lib/utils/format';
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from './_components/constants';
import { LeadForm } from './_components/LeadForm';
import type { LeadSource, LeadStatus } from '@/types';

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['leads', { page, search, status, source }],
    queryFn: () =>
      leadsApi.listLeads({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        source: source || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: leadsApi.createLead,
    onSuccess: () => {
      showSuccess('Lead created');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create lead')),
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Enquiry pipeline from every source"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:max-w-2xl">
        <Input
          placeholder="Search name, mobile, email"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Select
          placeholder="All statuses"
          options={LEAD_STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as LeadStatus | '');
          }}
        />
        <Select
          placeholder="All sources"
          options={LEAD_SOURCE_OPTIONS}
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value as LeadSource | '');
          }}
        />
      </div>

      <Card>
        <Table
          columns={[
            { header: 'Lead ID', accessor: (r) => r.leadCode },
            { header: 'Name', accessor: (r) => r.fullName },
            { header: 'Mobile', accessor: (r) => r.mobileNumber },
            { header: 'Source', accessor: (r) => titleCase(r.source) },
            { header: 'Score', accessor: (r) => r.leadScore },
            { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => router.push(`/leads/${r.id}`)}
          emptyMessage="No leads yet"
        />
        {data && (
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New lead">
        <LeadForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
