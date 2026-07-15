import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as purchaseService from './purchase.service';
import type {
  AddPurchaseInvoiceItemInput,
  ConfirmPurchaseInvoiceItemInput,
  CreatePurchaseInvoiceInput,
  IdParam,
  ItemIdParam,
  ListPurchaseInvoicesQuery,
} from './purchase.validation';

export const createPurchaseInvoice = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreatePurchaseInvoiceInput;
  const invoice = await purchaseService.createPurchaseInvoice(input, req.user!.id);
  res.status(201).json({ data: invoice });
});

export const getPurchaseInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const invoice = await purchaseService.getPurchaseInvoiceById(id);
  res.status(200).json({ data: invoice });
});

export const listPurchaseInvoices = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListPurchaseInvoicesQuery;
  const result = await purchaseService.listPurchaseInvoices(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const addPurchaseInvoiceItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as AddPurchaseInvoiceItemInput;
  const item = await purchaseService.addPurchaseInvoiceItem(id, input, req.user!.id);
  res.status(201).json({ data: item });
});

export const confirmPurchaseInvoiceItem = asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params as unknown as ItemIdParam;
  const input = req.body as ConfirmPurchaseInvoiceItemInput;
  const item = await purchaseService.confirmPurchaseInvoiceItem(id, itemId, input, req.user!.id);
  res.status(200).json({ data: item });
});
