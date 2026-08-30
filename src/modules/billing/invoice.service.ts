import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import { toPatientCode } from '../patients/patient.service';
import { incrementCouponUsage, resolveCouponDiscount } from './coupon.service';
import type {
  AddPaymentInput,
  CancelInvoiceInput,
  CreateInvoiceInput,
  ListInvoicesQuery,
} from './invoice.validation';

const WITH_RELATIONS = {
  items: true,
  payments: true,
  coupon: true,
  patient: {
    select: {
      fullName: true,
      patientNumber: true,
      mobileNumber: true,
      email: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
    },
  },
} as const;

// patientCode (e.g. "PT-000123") is derived from patientNumber, not a stored
// column — see patient.service.ts's toPatientCode, mirrored here since the
// invoice response embeds a read-only patient summary rather than reusing
// the patient module's own response shape.
function withPatientCode<T extends { patient: { patientNumber: number } }>(
  invoice: T,
): T & { patient: T['patient'] & { patientCode: string } } {
  return {
    ...invoice,
    patient: { ...invoice.patient, patientCode: toPatientCode(invoice.patient.patientNumber) },
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function createInvoice(input: CreateInvoiceInput, createdById: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  let subtotal = 0;
  let lineDiscountTotal = 0;
  let gstTotal = 0;

  const lineItems = input.items.map((item) => {
    const gross = item.quantity * item.unitPrice;
    const lineDiscount = gross * (item.discountPercent / 100);
    const taxable = gross - lineDiscount;
    const gst = taxable * (item.gstPercent / 100);
    const lineTotal = round2(taxable + gst);

    subtotal += gross;
    lineDiscountTotal += lineDiscount;
    gstTotal += gst;

    return { ...item, lineTotal };
  });

  let couponId: string | undefined;
  let couponDiscount = 0;
  if (input.couponCode) {
    const resolved = await resolveCouponDiscount(input.couponCode, subtotal);
    couponId = resolved.couponId;
    couponDiscount = resolved.discount;
  }

  const discountAmount = round2(lineDiscountTotal + input.doctorDiscountAmount + couponDiscount);
  const gstAmount = round2(gstTotal);
  const totalAmount = round2(subtotal - discountAmount + gstAmount);

  if (totalAmount < 0) {
    throw new BadRequestError('Discounts exceed the invoice subtotal');
  }

  const invoice = await prisma.invoice.create({
    data: {
      patientId: input.patientId,
      status: InvoiceStatus.ISSUED,
      subtotal: round2(subtotal),
      discountAmount,
      doctorDiscountAmount: input.doctorDiscountAmount,
      gstAmount,
      couponId,
      totalAmount,
      createdById,
      items: { create: lineItems },
    },
    include: WITH_RELATIONS,
  });

  if (couponId) {
    await incrementCouponUsage(couponId);
  }

  await recordAudit({
    userId: createdById,
    action: 'INVOICE_CREATED',
    resource: 'Invoice',
    resourceId: invoice.id,
    metadata: { totalAmount },
  });

  return withPatientCode(invoice);
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: WITH_RELATIONS });
  if (!invoice) throw new NotFoundError('Invoice not found');
  return withPatientCode(invoice);
}

export async function listInvoices(query: ListInvoicesQuery) {
  const where = {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: WITH_RELATIONS,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: items.map(withPatientCode),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function addPayment(invoiceId: string, input: AddPaymentInput, receivedById: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
    throw new ConflictError('Cannot record a payment against a cancelled/refunded invoice');
  }
  if (invoice.status === InvoiceStatus.PAID) {
    throw new ConflictError('This invoice is already fully paid');
  }

  const alreadyPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = Number(invoice.totalAmount) - alreadyPaid;
  if (input.amount > remaining + 0.01) {
    throw new BadRequestError(`Payment exceeds the remaining balance of ${remaining.toFixed(2)}`);
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: input.amount,
      mode: input.mode,
      transactionRef: input.transactionRef,
      receivedById,
    },
  });

  const newPaidTotal = alreadyPaid + input.amount;
  const newStatus =
    newPaidTotal >= Number(invoice.totalAmount) - 0.01
      ? InvoiceStatus.PAID
      : InvoiceStatus.PARTIALLY_PAID;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });

  await recordAudit({
    userId: receivedById,
    action: 'PAYMENT_RECORDED',
    resource: 'Invoice',
    resourceId: invoiceId,
    metadata: { amount: input.amount, mode: input.mode },
  });

  return payment;
}

export async function cancelInvoice(id: string, input: CancelInvoiceInput, actorId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.payments.length > 0) {
    throw new ConflictError(
      'An invoice with recorded payments cannot be cancelled directly — issue a refund instead',
    );
  }
  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new ConflictError('This invoice is already cancelled');
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.CANCELLED },
  });

  await recordAudit({
    userId: actorId,
    action: 'INVOICE_CANCELLED',
    resource: 'Invoice',
    resourceId: id,
    metadata: { reason: input.reason },
  });

  return updated;
}
