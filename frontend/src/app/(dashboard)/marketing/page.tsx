'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BarChart3 } from 'lucide-react';
import * as marketingApi from '@/lib/api/marketing';
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
import { titleCase } from '@/lib/utils/format';
import { LEAD_SOURCE_OPTIONS } from '../leads/_components/constants';
import { CampaignPerformanceModal } from './_components/CampaignPerformanceModal';
import type { Campaign, LeadSource } from '@/types';

interface FormValues {
  name: string;
  source: LeadSource;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  costPerLead: string;
  totalSpend: string;
}

export default function MarketingPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [performanceFor, setPerformanceFor] = useState<Campaign | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ['marketing', 'campaigns'], queryFn: () => marketingApi.listCampaigns({ limit: 100 }) });
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { source: 'FACEBOOK_ADS' } });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      marketingApi.createCampaign({
        name: values.name,
        source: values.source,
        utmSource: values.utmSource || undefined,
        utmMedium: values.utmMedium || undefined,
        utmCampaign: values.utmCampaign || undefined,
        costPerLead: values.costPerLead ? Number(values.costPerLead) : undefined,
        totalSpend: values.totalSpend ? Number(values.totalSpend) : undefined,
      }),
    onSuccess: () => {
      showSuccess('Campaign created');
      reset();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['marketing', 'campaigns'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create campaign')),
  });

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Campaigns and lead attribution"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        }
      />

      <Card>
        <Table
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Source', accessor: (r) => titleCase(r.source) },
            { header: 'Spend', accessor: (r) => (r.totalSpend ? `₹${r.totalSpend}` : '—') },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            {
              header: '',
              accessor: (r) => (
                <Button size="sm" variant="secondary" onClick={() => setPerformanceFor(r)}>
                  <BarChart3 className="h-3.5 w-3.5" /> Performance
                </Button>
              ),
            },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No campaigns yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New campaign">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" {...register('name', { required: true })} />
            <Select label="Source" options={LEAD_SOURCE_OPTIONS} {...register('source')} />
            <Input label="UTM source" {...register('utmSource')} />
            <Input label="UTM medium" {...register('utmMedium')} />
            <Input label="UTM campaign" {...register('utmCampaign')} />
            <Input label="Cost per lead (₹)" type="number" step="0.01" {...register('costPerLead')} />
            <Input label="Total spend (₹)" type="number" step="0.01" {...register('totalSpend')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={createMutation.isPending}>
              Save campaign
            </Button>
          </div>
        </form>
      </Modal>

      {performanceFor && <CampaignPerformanceModal campaign={performanceFor} onClose={() => setPerformanceFor(null)} />}
    </div>
  );
}
