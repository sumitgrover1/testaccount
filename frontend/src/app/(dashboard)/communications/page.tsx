'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as leadsApi from '@/lib/api/leads';
import * as patientsApi from '@/lib/api/patients';
import * as communicationsApi from '@/lib/api/communications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';

interface LogFormValues {
  channel: 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'NOTE';
  content: string;
}

export default function CommunicationsPage() {
  const [targetType, setTargetType] = useState<'lead' | 'patient'>('patient');
  const [targetId, setTargetId] = useState('');
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data: leads } = useQuery({ queryKey: ['leads', 'for-comms'], queryFn: () => leadsApi.listLeads({ limit: 200 }) });
  const { data: patients } = useQuery({ queryKey: ['patients', 'for-comms'], queryFn: () => patientsApi.listPatients({ limit: 200 }) });

  const timelineQuery = useQuery({
    queryKey: ['communications', 'timeline', targetType, targetId],
    queryFn: () => (targetType === 'lead' ? communicationsApi.getLeadTimeline(targetId) : communicationsApi.getPatientTimeline(targetId)),
    enabled: Boolean(targetId),
  });

  const { register, handleSubmit, reset } = useForm<LogFormValues>({ defaultValues: { channel: 'NOTE' } });

  const logMutation = useMutation({
    mutationFn: (values: LogFormValues) =>
      communicationsApi.createCommunicationLog({
        leadId: targetType === 'lead' ? targetId : undefined,
        patientId: targetType === 'patient' ? targetId : undefined,
        channel: values.channel,
        content: values.content,
      }),
    onSuccess: () => {
      showSuccess('Logged');
      reset();
      void queryClient.invalidateQueries({ queryKey: ['communications', 'timeline', targetType, targetId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to log communication')),
  });

  return (
    <div>
      <PageHeader title="Communications" description="Unified patient & lead history" />

      <div className="mb-4 flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={targetType === 'patient'}
            onChange={() => {
              setTargetType('patient');
              setTargetId('');
            }}
          />
          Patient
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={targetType === 'lead'}
            onChange={() => {
              setTargetType('lead');
              setTargetId('');
            }}
          />
          Lead
        </label>
      </div>

      <div className="mb-6 max-w-md">
        <Select
          placeholder={`Select ${targetType}`}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          options={
            targetType === 'lead'
              ? (leads?.data ?? []).map((l) => ({ label: `${l.fullName} (${l.leadCode})`, value: l.id }))
              : (patients?.data ?? []).map((p) => ({ label: `${p.fullName} (${p.patientCode})`, value: p.id }))
          }
        />
      </div>

      {targetId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Timeline" />
            <CardBody>
              <ol className="space-y-4 border-l border-slate-200 pl-4">
                {(timelineQuery.data ?? []).map((entry, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <p className="text-sm font-medium text-slate-800">{entry.summary}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(entry.occurredAt)}</p>
                  </li>
                ))}
                {(timelineQuery.data ?? []).length === 0 && <p className="text-sm text-slate-400">No history yet</p>}
              </ol>
            </CardBody>
          </Card>

          <Card className="h-fit">
            <CardHeader title="Log a communication" />
            <CardBody>
              <form onSubmit={handleSubmit((values) => logMutation.mutate(values))} className="space-y-4">
                <Select
                  label="Channel"
                  options={[
                    { label: 'Call', value: 'CALL' },
                    { label: 'WhatsApp', value: 'WHATSAPP' },
                    { label: 'SMS', value: 'SMS' },
                    { label: 'Email', value: 'EMAIL' },
                    { label: 'Note', value: 'NOTE' },
                  ]}
                  {...register('channel')}
                />
                <Textarea label="Notes" {...register('content', { required: true })} />
                <Button type="submit" className="w-full" isLoading={logMutation.isPending}>
                  Log
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
