'use client';

import { useQuery } from '@tanstack/react-query';
import * as marketingApi from '@/lib/api/marketing';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils/format';
import type { Campaign } from '@/types';

export function CampaignPerformanceModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'campaigns', campaign.id, 'performance'],
    queryFn: () => marketingApi.getCampaignPerformance(campaign.id),
  });

  return (
    <Modal open onClose={onClose} title={`Performance — ${campaign.name}`}>
      {isLoading || !data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Total leads</dt>
            <dd className="text-lg font-semibold">{data.totalLeads}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Converted</dt>
            <dd className="text-lg font-semibold">{data.convertedLeads}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Conversion rate</dt>
            <dd className="text-lg font-semibold">{data.conversionRate}%</dd>
          </div>
          <div>
            <dt className="text-slate-500">Total spend</dt>
            <dd className="text-lg font-semibold">{formatCurrency(data.totalSpend)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Cost per conversion</dt>
            <dd className="text-lg font-semibold">{data.costPerConversion !== null ? formatCurrency(data.costPerConversion) : '—'}</dd>
          </div>
        </dl>
      )}
    </Modal>
  );
}
