'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { LeadInput } from '@/lib/api/leads';
import { LEAD_SOURCE_OPTIONS } from './constants';

const schema = z.object({
  fullName: z.string().min(1, 'Required'),
  mobileNumber: z.string().min(7, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  source: z.enum([
    'FACEBOOK_ADS',
    'GOOGLE_ADS',
    'WEBSITE_FORM',
    'WALK_IN',
    'PHONE_CALL',
    'WHATSAPP',
    'INSTAGRAM',
    'REFERRAL',
  ]),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function LeadForm({ onSubmit, isSubmitting }: { onSubmit: (values: LeadInput) => Promise<void>; isSubmitting: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { source: 'WALK_IN' } });

  const submit = handleSubmit(async (values) => {
    await onSubmit({ ...values, email: values.email || undefined });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Mobile number" error={errors.mobileNumber?.message} {...register('mobileNumber')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Select label="Source" options={LEAD_SOURCE_OPTIONS} error={errors.source?.message} {...register('source')} />
      </div>
      <Textarea label="Notes" {...register('notes')} />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Save lead
        </Button>
      </div>
    </form>
  );
}
