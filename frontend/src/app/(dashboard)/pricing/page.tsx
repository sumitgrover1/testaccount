'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pricingApi from '@/lib/api/pricing';
import * as patientsApi from '@/lib/api/patients';
import * as treatmentsApi from '@/lib/api/treatments';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

export default function PricingPage() {
  const { showSuccess, showError } = useToast();
  const [patientId, setPatientId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: patients } = useQuery({ queryKey: ['patients', 'for-pricing'], queryFn: () => patientsApi.listPatients({ limit: 200 }) });
  const { data: treatments } = useQuery({ queryKey: ['treatments', 'for-pricing'], queryFn: () => treatmentsApi.listTreatments({ limit: 200 }) });

  const effectivePriceQuery = useQuery({
    queryKey: ['pricing', 'effective', patientId, treatmentId],
    queryFn: () => pricingApi.getEffectivePrice(patientId, treatmentId),
    enabled: Boolean(patientId && treatmentId),
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['pricing', 'requests'],
    queryFn: () => pricingApi.listPricingRequests({ limit: 50, status: 'PENDING' }),
  });

  const setPriceMutation = useMutation({
    mutationFn: () => pricingApi.setPatientTreatmentPrice({ patientId, treatmentId, price: Number(price), reason: reason || undefined }),
    onSuccess: (result) => {
      showSuccess(result.applied ? 'Price applied' : 'Approval request submitted — awaiting doctor/admin review');
      setPrice('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['pricing'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to set price')),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) => pricingApi.reviewPricingRequest(id, decision),
    onSuccess: () => {
      showSuccess('Request reviewed');
      void queryClient.invalidateQueries({ queryKey: ['pricing', 'requests'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to review request')),
  });

  return (
    <div>
      <PageHeader title="Pricing" description="Patient-specific overrides and approval workflow" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Set patient-specific price" />
          <CardBody className="space-y-4">
            <Select
              label="Patient"
              placeholder="Select patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              options={(patients?.data ?? []).map((p) => ({ label: `${p.fullName} (${p.patientCode})`, value: p.id }))}
            />
            <Select
              label="Treatment"
              placeholder="Select treatment"
              value={treatmentId}
              onChange={(e) => setTreatmentId(e.target.value)}
              options={(treatments?.data ?? []).map((t) => ({ label: t.name, value: t.id }))}
            />
            {effectivePriceQuery.data && (
              <p className="text-sm text-slate-600">
                Current effective price: <strong>{formatCurrency(effectivePriceQuery.data.price)}</strong>{' '}
                <span className="text-xs text-slate-400">({effectivePriceQuery.data.source === 'PATIENT_OVERRIDE' ? 'patient override' : 'treatment default'})</span>
              </p>
            )}
            <Input label="New price (₹)" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button
              disabled={!patientId || !treatmentId || !price}
              isLoading={setPriceMutation.isPending}
              onClick={() => setPriceMutation.mutate()}
            >
              Set price
            </Button>
            <p className="text-xs text-slate-400">
              Discounts beyond the configured threshold automatically create an approval request instead of applying immediately.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pending approval requests" />
          <CardBody className="p-0">
            <Table
              columns={[
                { header: 'Proposed', accessor: (r) => formatCurrency(r.proposedPrice) },
                { header: 'Threshold', accessor: (r) => formatCurrency(r.thresholdPrice) },
                { header: 'Requested', accessor: (r) => formatDateTime(r.createdAt) },
                { header: 'Status', accessor: (r) => <Badge status={r.status} /> },
                {
                  header: '',
                  accessor: (r) => (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewMutation.mutate({ id: r.id, decision: 'APPROVED' })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => reviewMutation.mutate({ id: r.id, decision: 'REJECTED' })}>
                        Reject
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={requests?.data ?? []}
              keyField={(r) => r.id}
              isLoading={requestsLoading}
              emptyMessage="No pending pricing approvals"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
