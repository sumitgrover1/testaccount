'use client';

import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { lookupPincode } from '@/lib/api/locations';
import { STATE_OPTIONS, getCityOptions } from '@/lib/utils/indiaStates';
import type { Patient } from '@/types';
import type { PatientInput } from '@/lib/api/patients';

const schema = z
  .object({
    fullName: z.string().min(1, 'Required'),
    mobileNumber: z.string().min(7, 'Required'),
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
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    occupation: z.string().optional(),
    referralSource: z.string().optional(),
    notes: z.string().optional(),
    allergies: z.string().optional(),
    existingDiseases: z.string().optional(),
    currentMedication: z.string().optional(),
    previousTreatmentHistory: z.string().optional(),
  })
  .refine((data) => Boolean(data.dateOfBirth) || data.age !== undefined, {
    message: 'Provide date of birth or age',
    path: ['dateOfBirth'],
  });

type FormValues = z.infer<typeof schema>;

export function PatientForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  defaultValues?: Partial<Patient>;
  onSubmit: (values: PatientInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { showError } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: defaultValues?.fullName ?? '',
      mobileNumber: defaultValues?.mobileNumber ?? '',
      gender: defaultValues?.gender ?? 'MALE',
      dateOfBirth: defaultValues?.dateOfBirth?.slice(0, 10) ?? '',
      age: defaultValues?.age ?? undefined,
      pincode: defaultValues?.pincode ?? '',
      city: defaultValues?.city ?? '',
      state: defaultValues?.state ?? '',
      email: defaultValues?.email ?? '',
      address: defaultValues?.address ?? '',
      occupation: defaultValues?.occupation ?? '',
      referralSource: defaultValues?.referralSource ?? '',
      notes: defaultValues?.notes ?? '',
      allergies: defaultValues?.allergies ?? '',
      existingDiseases: defaultValues?.existingDiseases ?? '',
      currentMedication: defaultValues?.currentMedication ?? '',
      previousTreatmentHistory: defaultValues?.previousTreatmentHistory ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      email: values.email || undefined,
      age: values.age || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      pincode: values.pincode || undefined,
    });
  });

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

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Mobile number" error={errors.mobileNumber?.message} {...register('mobileNumber')} />
        <Select
          label="Gender"
          error={errors.gender?.message}
          options={[
            { label: 'Male', value: 'MALE' },
            { label: 'Female', value: 'FEMALE' },
            { label: 'Other', value: 'OTHER' },
          ]}
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
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Occupation" {...register('occupation')} />
        <Input label="Referral source" {...register('referralSource')} />
      </div>
      <Textarea label="Address" {...register('address')} />
      <div className="grid grid-cols-2 gap-4">
        <Textarea label="Allergies" {...register('allergies')} />
        <Textarea label="Existing diseases" {...register('existingDiseases')} />
        <Textarea label="Current medication" {...register('currentMedication')} />
        <Textarea label="Previous treatment history" {...register('previousTreatmentHistory')} />
      </div>
      <Textarea label="Notes" {...register('notes')} />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Save patient
        </Button>
      </div>
    </form>
  );
}
