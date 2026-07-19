import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as supplierService from './supplier.service';
import type {
  CreateSupplierInput,
  IdParam,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from './supplier.validation';

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateSupplierInput;
  const supplier = await supplierService.createSupplier(input, req.user!.id);
  res.status(201).json({ data: supplier });
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const supplier = await supplierService.getSupplierById(id);
  res.status(200).json({ data: supplier });
});

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSuppliersQuery;
  const result = await supplierService.listSuppliers(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateSupplierInput;
  const supplier = await supplierService.updateSupplier(id, input, req.user!.id);
  res.status(200).json({ data: supplier });
});
