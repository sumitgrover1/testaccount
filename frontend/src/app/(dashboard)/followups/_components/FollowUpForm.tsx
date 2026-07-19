'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import * as leadsApi from '@/lib/api/leads';
import * as patientsApi from '@/lib/api/patients';
import * as usersApi from '@/lib/api/users';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface FormValues {
  targetId: string;
  assignedToId: string;
  channel: 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL';
  dueAt: string;
  notes: string;
}

export interface FollowUpFormOutput {
  leadId?: string;
  patientId?: string;
  assignedToId: string;
  channel: 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL';
  dueAt: string;
  notes?: string;
}

export function FollowUpForm({ onSubmit, isSubmitting }: { onSubmit: (values: FollowUpFormOutput) => Promise<void>; isSubmitting: boolean }) {
  const [targetType, setTargetType] = useState<'lead' | 'patient'>('lead');
  const { data: leads } = useQuery({ queryKey: ['leads', 'for-followup'], queryFn: () => leadsApi.listLeads({ limit: 100 }) });
  const { data: patients } = useQuery({ queryKey: ['patients', 'for-followup'], queryFn: () => patientsApi.listPatients({ limit: 100 }) });
  const { data: staff } = useQuery({ queryKey: ['users', 'for-followup'], queryFn: () => usersApi.listUsers({ limit: 100 }) });

  const { register, handleSubmit } = useForm<FormValues>({ defaultValues: { channel: 'CALL' } });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      leadId: targetType === 'lead' ? values.targetId : undefined,
      patientId: targetType === 'patient' ? values.targetId : undefined,
      assignedToId: values.assignedToId,
      channel: values.channel,
      dueAt: new Date(values.dueAt).toISOString(),
      notes: values.notes || undefined,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={targetType === 'lead'} onChange={() => setTargetType('lead')} /> Lead
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={targetType === 'patient'} onChange={() => setTargetType('patient')} /> Patient
        </label>
      </div>

      <Select
        label={targetType === 'lead' ? 'Lead' : 'Patient'}
        placeholder="Select"
        options={
          targetType === 'lead'
            ? (leads?.data ?? []).map((l) => ({ label: `${l.fullName} (${l.leadCode})`, value: l.id }))
            : (patients?.data ?? []).map((p) => ({ label: `${p.fullName} (${p.patientCode})`, value: p.id }))
        }
        {...register('targetId', { required: true })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Assigned to"
          placeholder="Select staff"
          options={(staff?.data ?? []).map((u) => ({ label: `${u.firstName} ${u.lastName}`, value: u.id }))}
          {...register('assignedToId', { required: true })}
        />
        <Select
          label="Channel"
          options={[
            { label: 'Call', value: 'CALL' },
            { label: 'WhatsApp', value: 'WHATSAPP' },
            { label: 'SMS', value: 'SMS' },
            { label: 'Email', value: 'EMAIL' },
          ]}
          {...register('channel')}
        />
        <Input label="Due at" type="datetime-local" {...register('dueAt', { required: true })} />
      </div>
      <Textarea label="Notes" {...register('notes')} />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Create follow-up
        </Button>
      </div>
    </form>
  );
}
