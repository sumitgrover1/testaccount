'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import * as leadsApi from '@/lib/api/leads';
import * as communicationsApi from '@/lib/api/communications';
import { lookupPincode } from '@/lib/api/locations';
import { STATE_OPTIONS, getCityOptions } from '@/lib/utils/indiaStates';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDateTime, titleCase } from '@/lib/utils/format';
import { LEAD_STATUS_OPTIONS } from '../_components/constants';

const convertSchema = z
  .object({
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    dateOfBirth: z.string().optional(),
    age: z.coerce.number().optional(),
    pincode: z
      .string()
      .regex(/^[1-9][0-9]{5}$/, 'Must be a 6-digit pincode')
      .optional()
      .or(z.literal('')),
    city: z.string().min(1, 'Required'),
    state: z.string().min(1, 'Required'),
  })
  .refine((data) => Boolean(data.dateOfBirth) || data.age !== undefined, {
    message: 'Provide date of birth or age',
    path: ['dateOfBirth'],
  });
type ConvertValues = z.infer<typeof convertSchema>;

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [convertOpen, setConvertOpen] = useState(false);

  const { data: lead } = useQuery({ queryKey: ['leads', leadId], queryFn: () => leadsApi.getLead(leadId) });
  const { data: timeline } = useQuery({
    queryKey: ['leads', leadId, 'timeline'],
    queryFn: () => communicationsApi.getLeadTimeline(leadId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => leadsApi.changeLeadStatus(leadId, status as never),
    onSuccess: () => {
      showSuccess('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to update status')),
  });

  const convertMutation = useMutation({
    mutationFn: (values: ConvertValues) => leadsApi.convertLead(leadId, values),
    onSuccess: ({ patient }) => {
      showSuccess('Lead converted to patient');
      setConvertOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId] });
      router.push(`/patients/${patient.id}`);
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to convert lead')),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConvertValues>({ resolver: zodResolver(convertSchema), defaultValues: { gender: 'MALE' } });

  const pincode = watch('pincode');
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(lookupTimer.current);
    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) return;

    lookupTimer.current = setTimeout(() => {
      lookupPincode(pincode)
        .then((result) => {
          if (result.valid) {
            if (result.city) setValue('city', result.city, { shouldValidate: true });
            if (result.state) setValue('state', result.state, { shouldValidate: true });
          } else {
            showError("Couldn't find that pincode — enter city/state manually");
          }
        })
        .catch(() => showError('Pincode lookup failed — enter city/state manually'));
    }, 400);

    return () => clearTimeout(lookupTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode]);

  const selectedState = watch('state');
  const cityOptions = getCityOptions(selectedState);

  if (!lead) return null;

  const isConverted = lead.status === 'CONVERTED';

  return (
    <div>
      <PageHeader
        title={lead.fullName}
        description={`${lead.leadCode} · ${lead.mobileNumber} · ${titleCase(lead.source)}`}
        action={<Badge status={lead.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Pipeline status" />
          <CardBody className="space-y-3">
            {isConverted ? (
              <p className="text-sm text-slate-500">This lead has been converted and is now a patient.</p>
            ) : (
              <>
                <Select
                  options={LEAD_STATUS_OPTIONS}
                  value={lead.status}
                  onChange={(e) => statusMutation.mutate(e.target.value)}
                />
                <Button className="w-full" variant="secondary" onClick={() => setConvertOpen(true)}>
                  Convert to patient
                </Button>
              </>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Lead score</dt>
                <dd className="font-medium">{lead.leadScore}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium">{lead.email ?? '—'}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Timeline" />
          <CardBody>
            <ol className="space-y-4 border-l border-slate-200 pl-4">
              {(timeline ?? []).map((entry, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                  <p className="text-sm font-medium text-slate-800">{entry.summary}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(entry.occurredAt)}</p>
                </li>
              ))}
              {(timeline ?? []).length === 0 && <p className="text-sm text-slate-400">No history yet</p>}
            </ol>
          </CardBody>
        </Card>
      </div>

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert lead to patient">
        <form
          onSubmit={handleSubmit((values) =>
            convertMutation.mutate({ ...values, pincode: values.pincode || undefined }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Gender"
              options={[
                { label: 'Male', value: 'MALE' },
                { label: 'Female', value: 'FEMALE' },
                { label: 'Other', value: 'OTHER' },
              ]}
              error={errors.gender?.message}
              {...register('gender')}
            />
            <Input label="Date of birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
            <Input label="Age (if DOB unknown)" type="number" {...register('age')} />
            <Input
              label="Pincode"
              placeholder="e.g. 122001"
              maxLength={6}
              error={errors.pincode?.message}
              {...register('pincode')}
            />
            <Select label="State" error={errors.state?.message} options={STATE_OPTIONS} placeholder="Select state" {...register('state')} />
            <Select
              label="City"
              error={errors.city?.message}
              options={cityOptions}
              placeholder={selectedState ? 'Select city' : 'Select a state first'}
              disabled={!selectedState}
              {...register('city')}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={convertMutation.isPending}>
              Convert
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
