'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import * as treatmentsApi from '@/lib/api/treatments';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { PackageInput } from '@/lib/api/packages';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  defaultPrice: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  validityDays: z.coerce.number().int().positive().optional(),
  items: z
    .array(z.object({ treatmentId: z.string().min(1, 'Required'), quantity: z.coerce.number().int().positive() }))
    .min(1, 'Add at least one treatment'),
});
type FormValues = z.infer<typeof schema>;

export function PackageForm({ onSubmit, isSubmitting }: { onSubmit: (values: PackageInput) => Promise<void>; isSubmitting: boolean }) {
  const { data: treatments } = useQuery({
    queryKey: ['treatments', 'for-package-form'],
    queryFn: () => treatmentsApi.listTreatments({ limit: 100, isActive: true }),
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ treatmentId: '', quantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const treatmentOptions = (treatments?.data ?? []).map((t) => ({ label: t.name, value: t.id }));

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Package name" error={errors.name?.message} {...register('name')} />
        <Input label="Default price (₹)" type="number" step="0.01" error={errors.defaultPrice?.message} {...register('defaultPrice')} />
        <Input label="Discount %" type="number" step="0.01" {...register('discountPercent')} />
        <Input label="Validity (days)" type="number" {...register('validityDays')} />
      </div>
      <Textarea label="Description" {...register('description')} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Included treatments</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => append({ treatmentId: '', quantity: 1 })}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  placeholder="Select treatment"
                  options={treatmentOptions}
                  error={errors.items?.[index]?.treatmentId?.message}
                  {...register(`items.${index}.treatmentId` as const)}
                />
              </div>
              <div className="w-28">
                <Input type="number" placeholder="Sessions" {...register(`items.${index}.quantity` as const)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          ))}
        </div>
        {errors.items?.message && <p className="mt-1 text-xs text-rose-600">{errors.items.message}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Save package
        </Button>
      </div>
    </form>
  );
}
