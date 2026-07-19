'use client';

import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import * as patientsApi from '@/lib/api/patients';
import * as treatmentsApi from '@/lib/api/treatments';
import * as usersApi from '@/lib/api/users';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { AppointmentInput } from '@/lib/api/appointments';

interface FormValues {
  patientId: string;
  doctorId: string;
  treatmentId: string;
  scheduledDate: string;
  notes: string;
}

export function AppointmentForm({ onSubmit, isSubmitting }: { onSubmit: (values: AppointmentInput) => Promise<void>; isSubmitting: boolean }) {
  const { data: patients } = useQuery({ queryKey: ['patients', 'for-appointment'], queryFn: () => patientsApi.listPatients({ limit: 100 }) });
  const { data: treatments } = useQuery({ queryKey: ['treatments', 'for-appointment'], queryFn: () => treatmentsApi.listTreatments({ limit: 100, isActive: true }) });
  const { data: doctors } = useQuery({ queryKey: ['users', 'doctors'], queryFn: () => usersApi.listUsers({ role: 'DOCTOR', limit: 100 }) });

  const { register, handleSubmit } = useForm<FormValues>();

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      patientId: values.patientId,
      doctorId: values.doctorId,
      treatmentId: values.treatmentId || undefined,
      scheduledDate: new Date(values.scheduledDate).toISOString(),
      notes: values.notes || undefined,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Patient"
          placeholder="Select patient"
          options={(patients?.data ?? []).map((p) => ({ label: `${p.fullName} (${p.patientCode})`, value: p.id }))}
          {...register('patientId', { required: true })}
        />
        <Select
          label="Doctor"
          placeholder="Select doctor"
          options={(doctors?.data ?? []).map((d) => ({ label: `${d.firstName} ${d.lastName}`, value: d.id }))}
          {...register('doctorId', { required: true })}
        />
        <Select
          label="Treatment (optional)"
          placeholder="Select treatment"
          options={(treatments?.data ?? []).map((t) => ({ label: t.name, value: t.id }))}
          {...register('treatmentId')}
        />
        <Input label="Date & time" type="datetime-local" {...register('scheduledDate', { required: true })} />
      </div>
      <Textarea label="Notes" {...register('notes')} />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Book appointment
        </Button>
      </div>
    </form>
  );
}
