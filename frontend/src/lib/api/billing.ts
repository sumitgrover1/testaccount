import { apiClient } from './client';
import type { ApiEnvelope, Coupon, Invoice, InvoiceItemType, InvoiceStatus, Paginated, Payment, PaymentMode } from '@/types';

export interface InvoiceItemInput {
  itemType: InvoiceItemType;
  treatmentId?: string;
  packageId?: string;
  productBatchId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
  discountPercent?: number;
  gstPercent?: number;
}

export async function createInvoice(input: {
  patientId: string;
  items: InvoiceItemInput[];
  doctorDiscountAmount?: number;
  couponCode?: string;
}) {
  const res = await apiClient.post<ApiEnvelope<Invoice>>('/billing/invoices', input);
  return res.data.data;
}

export async function listInvoices(params: {
  page?: number;
  limit?: number;
  patientId?: string;
  status?: InvoiceStatus;
}) {
  const res = await apiClient.get<Paginated<Invoice>>('/billing/invoices', { params });
  return res.data;
}

export async function getInvoice(id: string) {
  const res = await apiClient.get<ApiEnvelope<Invoice>>(`/billing/invoices/${id}`);
  return res.data.data;
}

export async function addPayment(invoiceId: string, input: { amount: number; mode: PaymentMode; transactionRef?: string }) {
  const res = await apiClient.post<ApiEnvelope<Payment>>(`/billing/invoices/${invoiceId}/payments`, input);
  return res.data.data;
}

export async function cancelInvoice(id: string, reason?: string) {
  const res = await apiClient.post<ApiEnvelope<Invoice>>(`/billing/invoices/${id}/cancel`, { reason });
  return res.data.data;
}

export interface CouponInput {
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  validFrom?: string;
  validTo?: string;
  maxUses?: number;
}

export async function createCoupon(input: CouponInput) {
  const res = await apiClient.post<ApiEnvelope<Coupon>>('/billing/coupons', input);
  return res.data.data;
}

export async function listCoupons(params: { page?: number; limit?: number; isActive?: boolean }) {
  const res = await apiClient.get<Paginated<Coupon>>('/billing/coupons', { params });
  return res.data;
}

export async function updateCoupon(id: string, input: { validFrom?: string; validTo?: string; maxUses?: number; isActive?: boolean }) {
  const res = await apiClient.patch<ApiEnvelope<Coupon>>(`/billing/coupons/${id}`, input);
  return res.data.data;
}
