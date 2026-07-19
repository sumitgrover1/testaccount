'use client';

import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import * as patientsApi from '@/lib/api/patients';
import * as treatmentsApi from '@/lib/api/treatments';
import * as packagesApi from '@/lib/api/packages';
import * as usersApi from '@/lib/api/users';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { CreateEnrollmentInput } from '@/lib/api/enrollments';
import { Plus, Trash2 } from 'lucide-react';

interface FormValues {
  patientId: string;
  assignedDoctorId: string;
  assignedTherapistId: string;
  mode: 'package' | 'items';
  packageId: string;
  items: { treatmentId: string; sessionsTotal: string }[];
}

export function EnrollmentForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: CreateEnrollmentInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { data: patients } = useQuery({ queryKey: ['patients', 'for-enrollment'], queryFn: () => patientsApi.listPatients({ limit: 100 }) });
  const { data: treatments } = useQuery({ queryKey: ['treatments', 'for-enrollment'], queryFn: () => treatmentsApi.listTreatments({ limit: 100, isActive: true }) });
  const { data: packages } = useQuery({ queryKey: ['packages', 'for-enrollment'], queryFn: () => packagesApi.listPackages({ limit: 100, isActive: true }) });
  const { data: doctors } = useQuery({ queryKey: ['users', 'doctors'], queryFn: () => usersApi.listUsers({ role: 'DOCTOR', limit: 100 }) });

  const [mode, setMode] = useState<'package' | 'items'>('package');

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: { items: [{ treatmentId: '', sessionsTotal: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      patientId: values.patientId,
      assignedDoctorId: values.assignedDoctorId,
      assignedTherapistId: values.assignedTherapistId || undefined,
      packageId: mode === 'package' ? values.packageId : undefined,
      items:
        mode === 'items'
          ? values.items
              .filter((i) => i.treatmentId)
              .map((i) => ({ treatmentId: i.treatmentId, sessionsTotal: i.sessionsTotal ? Number(i.sessionsTotal) : undefined }))
          : undefined,
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
          label="Assigned doctor"
          placeholder="Select doctor"
          options={(doctors?.data ?? []).map((d) => ({ label: `${d.firstName} ${d.lastName}`, value: d.id }))}
          {...register('assignedDoctorId', { required: true })}
        />
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'package'} onChange={() => setMode('package')} /> Enroll into a package
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'items'} onChange={() => setMode('items')} /> Enroll into treatment(s)
        </label>
      </div>

      {mode === 'package' ? (
        <Select
          label="Package"
          placeholder="Select package"
          options={(packages?.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
          {...register('packageId')}
        />
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  placeholder="Select treatment"
                  options={(treatments?.data ?? []).map((t) => ({ label: t.name, value: t.id }))}
                  {...register(`items.${index}.treatmentId` as const)}
                />
              </div>
              <div className="w-32">
                <Input placeholder="Sessions (default)" type="number" {...register(`items.${index}.sessionsTotal` as const)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={() => append({ treatmentId: '', sessionsTotal: '' })}>
            <Plus className="h-3.5 w-3.5" /> Add treatment
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Create enrollment
        </Button>
      </div>
    </form>
  );
}
