'use client';

import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as inventoryApi from '@/lib/api/inventory';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import type { PurchaseInvoiceItem } from '@/types';

interface ConfirmFormValues {
  matchedProductId: string;
  batchNumber: string;
  quantity: string;
  purchasePrice: string;
  mrp: string;
  expiryDate: string;
  gstPercent: string;
}

function ConfirmItemForm({ invoiceId, item }: { invoiceId: string; item: PurchaseInvoiceItem }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { data: products } = useQuery({ queryKey: ['inventory', 'products', 'all'], queryFn: () => inventoryApi.listProducts({ limit: 100 }) });
  const { register, handleSubmit } = useForm<ConfirmFormValues>({
    defaultValues: {
      matchedProductId: item.matchedProductId ?? '',
      batchNumber: item.batchNumber ?? '',
      quantity: String(item.quantity ?? ''),
      purchasePrice: item.purchasePrice ? String(item.purchasePrice) : '',
      mrp: item.mrp ? String(item.mrp) : '',
      expiryDate: item.expiryDate?.slice(0, 10) ?? '',
      gstPercent: item.gstPercent ? String(item.gstPercent) : '',
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (values: ConfirmFormValues) =>
      inventoryApi.confirmPurchaseInvoiceItem(invoiceId, item.id, {
        matchedProductId: values.matchedProductId,
        batchNumber: values.batchNumber,
        quantity: Number(values.quantity),
        purchasePrice: Number(values.purchasePrice),
        mrp: values.mrp ? Number(values.mrp) : undefined,
        expiryDate: new Date(values.expiryDate).toISOString(),
        gstPercent: values.gstPercent ? Number(values.gstPercent) : undefined,
      }),
    onSuccess: () => {
      showSuccess('Item confirmed and added to inventory');
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-invoices', invoiceId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to confirm item')),
  });

  return (
    <form onSubmit={handleSubmit((values) => confirmMutation.mutate(values))} className="grid grid-cols-3 gap-3 rounded-lg border border-slate-100 p-4">
      <div className="col-span-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">{item.productNameRaw}</p>
        <Badge status={item.isValidated ? 'PROCESSED' : 'PENDING'} label={item.isValidated ? 'Confirmed' : 'Needs review'} />
      </div>
      <Select
        label="Matched product"
        placeholder="Select product"
        options={(products?.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
        disabled={item.isValidated}
        {...register('matchedProductId', { required: true })}
      />
      <Input label="Batch number" disabled={item.isValidated} {...register('batchNumber', { required: true })} />
      <Input label="Quantity" type="number" disabled={item.isValidated} {...register('quantity', { required: true })} />
      <Input label="Purchase price (₹)" type="number" step="0.01" disabled={item.isValidated} {...register('purchasePrice', { required: true })} />
      <Input label="MRP (₹)" type="number" step="0.01" disabled={item.isValidated} {...register('mrp')} />
      <Input label="Expiry date" type="date" disabled={item.isValidated} {...register('expiryDate', { required: true })} />
      <Input label="GST %" type="number" step="0.01" disabled={item.isValidated} {...register('gstPercent')} />
      {!item.isValidated && (
        <div className="col-span-3 flex justify-end">
          <Button type="submit" size="sm" isLoading={confirmMutation.isPending}>
            Confirm & add to stock
          </Button>
        </div>
      )}
    </form>
  );
}

interface ManualItemFormValues {
  productNameRaw: string;
  quantity: string;
}

function AddManualItemForm({ invoiceId }: { invoiceId: string }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { register, handleSubmit, reset } = useForm<ManualItemFormValues>();

  const addMutation = useMutation({
    mutationFn: (values: ManualItemFormValues) =>
      inventoryApi.addPurchaseInvoiceItem(invoiceId, { productNameRaw: values.productNameRaw, quantity: Number(values.quantity) }),
    onSuccess: () => {
      showSuccess('Line item added — confirm it below to add stock');
      reset();
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-invoices', invoiceId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to add item')),
  });

  return (
    <form onSubmit={handleSubmit((values) => addMutation.mutate(values))} className="flex items-end gap-3 border-t border-slate-100 pt-4">
      <div className="flex-1">
        <Input label="Product name (as on invoice)" {...register('productNameRaw', { required: true })} />
      </div>
      <div className="w-32">
        <Input label="Quantity" type="number" {...register('quantity', { required: true })} />
      </div>
      <Button type="submit" size="sm" variant="secondary" isLoading={addMutation.isPending}>
        Add line item
      </Button>
    </form>
  );
}

export default function PurchaseInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;
  const { data: invoice } = useQuery({
    queryKey: ['inventory', 'purchase-invoices', invoiceId],
    queryFn: () => inventoryApi.getPurchaseInvoice(invoiceId),
  });

  if (!invoice) return null;

  return (
    <div>
      <PageHeader
        title={`Purchase Invoice ${invoice.invoiceNumber ?? ''}`}
        description={invoice.supplier?.name}
        action={<Badge status={invoice.ocrStatus} />}
      />
      <Card>
        <CardHeader title="Line items" />
        <CardBody className="space-y-4">
          {invoice.items.length === 0 && <p className="text-sm text-slate-400">No items extracted — this invoice needs manual entry.</p>}
          {invoice.items.map((item) => (
            <ConfirmItemForm key={item.id} invoiceId={invoiceId} item={item} />
          ))}
          <AddManualItemForm invoiceId={invoiceId} />
        </CardBody>
      </Card>
    </div>
  );
}
