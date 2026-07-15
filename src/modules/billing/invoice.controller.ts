import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as invoiceService from './invoice.service';
import type {
  AddPaymentInput,
  CancelInvoiceInput,
  CreateInvoiceInput,
  IdParam,
  ListInvoicesQuery,
} from './invoice.validation';

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateInvoiceInput;
  const invoice = await invoiceService.createInvoice(input, req.user!.id);
  res.status(201).json({ data: invoice });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const invoice = await invoiceService.getInvoiceById(id);
  res.status(200).json({ data: invoice });
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListInvoicesQuery;
  const result = await invoiceService.listInvoices(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as AddPaymentInput;
  const payment = await invoiceService.addPayment(id, input, req.user!.id);
  res.status(201).json({ data: payment });
});

export const cancelInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as CancelInvoiceInput;
  const invoice = await invoiceService.cancelInvoice(id, input, req.user!.id);
  res.status(200).json({ data: invoice });
});
