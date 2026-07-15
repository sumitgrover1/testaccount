'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import * as patientsApi from '@/lib/api/patients';
import * as treatmentsApi from '@/lib/api/treatments';
import * as packagesApi from '@/lib/api/packages';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { InvoiceItemInput } from '@/lib/api/billing';
import type { InvoiceItemType } from '@/types';

interface ItemFormValues {
  itemType: InvoiceItemType;
  treatmentId: string;
  packageId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  gstPercent: string;
}

interface FormValues {
  patientId: string;
  couponCode: string;
  doctorDiscountAmount: string;
  items: ItemFormValues[];
}

export interface InvoiceFormOutput {
  patientId: string;
  items: InvoiceItemInput[];
  couponCode?: string;
  doctorDiscountAmount?: number;
}

const emptyItem: ItemFormValues = {
  itemType: 'TREATMENT',
  treatmentId: '',
  packageId: '',
  description: '',
  quantity: '1',
  unitPrice: '',
  discountPercent: '0',
  gstPercent: '0',
};

export function InvoiceForm({ onSubmit, isSubmitting }: { onSubmit: (values: InvoiceFormOutput) => Promise<void>; isSubmitting: boolean }) {
  const { data: patients } = useQuery({ queryKey: ['patients', 'for-invoice'], queryFn: () => patientsApi.listPatients({ limit: 200 }) });
  const { data: treatments } = useQuery({ queryKey: ['treatments', 'for-invoice'], queryFn: () => treatmentsApi.listTreatments({ limit: 200 }) });
  const { data: packages } = useQuery({ queryKey: ['packages', 'for-invoice'], queryFn: () => packagesApi.listPackages({ limit: 200 }) });

  const { register, control, handleSubmit, watch } = useForm<FormValues>({ defaultValues: { items: [emptyItem] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      patientId: values.patientId,
      couponCode: values.couponCode || undefined,
      doctorDiscountAmount: values.doctorDiscountAmount ? Number(values.doctorDiscountAmount) : undefined,
      items: values.items.map((item) => ({
        itemType: item.itemType,
        treatmentId: item.itemType === 'TREATMENT' ? item.treatmentId : undefined,
        packageId: item.itemType === 'PACKAGE' ? item.packageId : undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        gstPercent: Number(item.gstPercent || 0),
      })),
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select
        label="Patient"
        placeholder="Select patient"
        options={(patients?.data ?? []).map((p) => ({ label: `${p.fullName} (${p.patientCode})`, value: p.id }))}
        {...register('patientId', { required: true })}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Line items</p>
        {fields.map((field, index) => {
          const itemType = watch(`items.${index}.itemType`);
          return (
            <div key={field.id} className="grid grid-cols-6 gap-2 rounded-lg border border-slate-100 p-3">
              <Select
                label="Type"
                options={[
                  { label: 'Treatment', value: 'TREATMENT' },
                  { label: 'Package', value: 'PACKAGE' },
                  { label: 'Product', value: 'PRODUCT' },
                ]}
                {...register(`items.${index}.itemType` as const)}
              />
              {itemType === 'TREATMENT' && (
                <Select
                  label="Treatment"
                  placeholder="Select"
                  options={(treatments?.data ?? []).map((t) => ({ label: t.name, value: t.id }))}
                  {...register(`items.${index}.treatmentId` as const)}
                />
              )}
              {itemType === 'PACKAGE' && (
                <Select
                  label="Package"
                  placeholder="Select"
                  options={(packages?.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
                  {...register(`items.${index}.packageId` as const)}
                />
              )}
              <Input label="Description" {...register(`items.${index}.description` as const, { required: true })} />
              <Input label="Qty" type="number" step="0.01" {...register(`items.${index}.quantity` as const)} />
              <Input label="Unit price (₹)" type="number" step="0.01" {...register(`items.${index}.unitPrice` as const, { required: true })} />
              <Input label="Discount %" type="number" step="0.01" {...register(`items.${index}.discountPercent` as const)} />
              <Input label="GST %" type="number" step="0.01" {...register(`items.${index}.gstPercent` as const)} />
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button type="button" size="sm" variant="secondary" onClick={() => append(emptyItem)}>
          <Plus className="h-3.5 w-3.5" /> Add line item
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Coupon code (optional)" {...register('couponCode')} />
        <Input label="Doctor discount (₹)" type="number" step="0.01" {...register('doctorDiscountAmount')} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Generate invoice
        </Button>
      </div>
    </form>
  );
}
