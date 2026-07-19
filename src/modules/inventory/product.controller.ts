import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as productService from './product.service';
import type {
  AddConsumptionRuleInput,
  AdjustStockInput,
  BatchIdParam,
  CreateBatchInput,
  CreateProductInput,
  IdParam,
  ListProductsQuery,
  RuleIdParam,
  UpdateProductInput,
} from './product.validation';

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateProductInput;
  const product = await productService.createProduct(input, req.user!.id);
  res.status(201).json({ data: product });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const product = await productService.getProductById(id);
  res.status(200).json({ data: product });
});

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;
  const result = await productService.listProducts(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const listLowStockProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await productService.listLowStockProducts();
  res.status(200).json({ data: products });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateProductInput;
  const product = await productService.updateProduct(id, input, req.user!.id);
  res.status(200).json({ data: product });
});

export const createBatch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as CreateBatchInput;
  const batch = await productService.createBatch(id, input, req.user!.id);
  res.status(201).json({ data: batch });
});

export const listBatchesForProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const batches = await productService.listBatchesForProduct(id);
  res.status(200).json({ data: batches });
});

export const adjustBatchStock = asyncHandler(async (req: Request, res: Response) => {
  const { id, batchId } = req.params as unknown as BatchIdParam;
  const input = req.body as AdjustStockInput;
  const movement = await productService.adjustBatchStock(id, batchId, input, req.user!.id);
  res.status(201).json({ data: movement });
});

export const listBatchMovements = asyncHandler(async (req: Request, res: Response) => {
  const { id, batchId } = req.params as unknown as BatchIdParam;
  const movements = await productService.listBatchMovements(id, batchId);
  res.status(200).json({ data: movements });
});

export const addConsumptionRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as AddConsumptionRuleInput;
  const rule = await productService.addConsumptionRule(id, input, req.user!.id);
  res.status(201).json({ data: rule });
});

export const listConsumptionRules = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const rules = await productService.listConsumptionRules(id);
  res.status(200).json({ data: rules });
});

export const removeConsumptionRule = asyncHandler(async (req: Request, res: Response) => {
  const { id, ruleId } = req.params as unknown as RuleIdParam;
  await productService.removeConsumptionRule(id, ruleId, req.user!.id);
  res.status(204).send();
});
