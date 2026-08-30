'use client';

import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import * as billingApi from '@/lib/api/billing';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import { CLINIC_INFO } from '@/lib/utils/clinicInfo';

interface PaymentFormValues {
  amount: string;
  mode: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  transactionRef: string;
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data: invoice } = useQuery({ queryKey: ['billing', 'invoices', invoiceId], queryFn: () => billingApi.getInvoice(invoiceId) });
  const { register, handleSubmit, reset } = useForm<PaymentFormValues>({ defaultValues: { mode: 'CASH' } });

  const paymentMutation = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      billingApi.addPayment(invoiceId, { amount: Number(values.amount), mode: values.mode, transactionRef: values.transactionRef || undefined }),
    onSuccess: () => {
      showSuccess('Payment recorded');
      reset();
      void queryClient.invalidateQueries({ queryKey: ['billing', 'invoices', invoiceId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to record payment')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancelInvoice(invoiceId),
    onSuccess: () => {
      showSuccess('Invoice cancelled');
      void queryClient.invalidateQueries({ queryKey: ['billing', 'invoices', invoiceId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to cancel invoice')),
  });

  if (!invoice) return null;

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.totalAmount) - paid;
  const canPay = invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID';
  const canCancel = invoice.payments.length === 0 && invoice.status !== 'CANCELLED';

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title={`Invoice #${invoice.invoiceNumber}`}
          description={formatDateTime(invoice.createdAt)}
          action={
            <div className="flex items-center gap-3">
              <Badge status={invoice.status} />
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </div>
          }
        />
      </div>

      {/* Printable tax invoice — hidden on screen, shown only by window.print()
          (see ProtectedShell's print: overrides for the sidebar/topbar/layout). */}
      <div className="hidden print:block">
        <div className="mb-6 flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">{CLINIC_INFO.name}</h1>
            <p className="text-sm text-slate-600">{CLINIC_INFO.addressLine1}</p>
            <p className="text-sm text-slate-600">{CLINIC_INFO.addressLine2}</p>
            <p className="text-sm text-slate-600">{CLINIC_INFO.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-900">Tax Invoice</h2>
            <p className="text-sm text-slate-600">Invoice #{invoice.invoiceNumber}</p>
            <p className="text-sm text-slate-600">{formatDate(invoice.createdAt)}</p>
            <p className="text-sm font-medium text-slate-900">{invoice.status}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billed to</p>
          <p className="text-sm font-medium text-slate-900">{invoice.patient.fullName}</p>
          <p className="text-sm text-slate-600">{invoice.patient.patientCode}</p>
          <p className="text-sm text-slate-600">{invoice.patient.mobileNumber}</p>
          {invoice.patient.email && <p className="text-sm text-slate-600">{invoice.patient.email}</p>}
          {invoice.patient.address && <p className="text-sm text-slate-600">{invoice.patient.address}</p>}
          <p className="text-sm text-slate-600">
            {invoice.patient.city}, {invoice.patient.state}
            {invoice.patient.pincode ? ` - ${invoice.patient.pincode}` : ''}
          </p>
        </div>

        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Discount %</th>
              <th className="py-2 text-right">GST %</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{String(item.quantity)}</td>
                <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-right">{String(item.discountPercent)}</td>
                <td className="py-2 text-right">{String(item.gstPercent)}</td>
                <td className="py-2 text-right">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Discount</span>
            <span>-{formatCurrency(invoice.discountAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">GST</span>
            <span>+{formatCurrency(invoice.gstAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-1 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Paid</span>
            <span>{formatCurrency(invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0))}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Balance due</span>
            <span>
              {formatCurrency(
                Number(invoice.totalAmount) - invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0),
              )}
            </span>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">Thank you for choosing {CLINIC_INFO.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 print:hidden lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Line items" />
            <CardBody className="p-0">
              <Table
                columns={[
                  { header: 'Description', accessor: (r) => r.description },
                  { header: 'Qty', accessor: (r) => String(r.quantity) },
                  { header: 'Unit price', accessor: (r) => formatCurrency(r.unitPrice) },
                  { header: 'GST %', accessor: (r) => String(r.gstPercent) },
                  { header: 'Line total', accessor: (r) => formatCurrency(r.lineTotal) },
                ]}
                rows={invoice.items}
                keyField={(r) => r.id}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            <CardBody className="p-0">
              <Table
                columns={[
                  { header: 'Amount', accessor: (r) => formatCurrency(r.amount) },
                  { header: 'Mode', accessor: (r) => r.mode },
                  { header: 'Reference', accessor: (r) => r.transactionRef ?? '—' },
                  { header: 'Paid at', accessor: (r) => formatDateTime(r.paidAt) },
                ]}
                rows={invoice.payments}
                keyField={(r) => r.id}
                emptyMessage="No payments recorded yet"
              />
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Summary" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span>-{formatCurrency(invoice.discountAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GST</span>
              <span>+{formatCurrency(invoice.gstAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Paid</span>
              <span>{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Remaining</span>
              <span>{formatCurrency(remaining)}</span>
            </div>

            {canPay && (
              <form onSubmit={handleSubmit((values) => paymentMutation.mutate(values))} className="space-y-3 border-t border-slate-100 pt-4">
                <Input label="Amount (₹)" type="number" step="0.01" {...register('amount', { required: true })} />
                <Select
                  label="Mode"
                  options={[
                    { label: 'Cash', value: 'CASH' },
                    { label: 'UPI', value: 'UPI' },
                    { label: 'Card', value: 'CARD' },
                    { label: 'Split', value: 'SPLIT' },
                  ]}
                  {...register('mode')}
                />
                <Input label="Transaction ref (optional)" {...register('transactionRef')} />
                <Button type="submit" className="w-full" isLoading={paymentMutation.isPending}>
                  Record payment
                </Button>
              </form>
            )}

            {canCancel && (
              <Button variant="danger" className="w-full" isLoading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                Cancel invoice
              </Button>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
