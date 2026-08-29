import type { Request, Response } from 'express';
import type { VehicleType } from '@prisma/client';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/respond';
import * as catalogService from './catalog.service';

export const listBrands = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as Parameters<typeof catalogService.listBrands>[0];
  ok(res, await catalogService.listBrands(query));
});

export const listModels = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as catalogService.ListModelsInput;
  const { items, meta } = await catalogService.listModels(query);
  ok(res, items, meta);
});

export const getModel = asyncHandler(async (req: Request, res: Response) => {
  const { brandSlug, modelSlug } = req.params;
  ok(res, await catalogService.getModelDetail(brandSlug, modelSlug));
});

export const getSimilar = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await catalogService.getSimilarModels(req.params.id));
});

export const compare = asyncHandler(async (req: Request, res: Response) => {
  const { variantIds } = req.query as unknown as { variantIds: string[] };
  ok(res, await catalogService.compareVariants(variantIds));
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q, vehicleType, limit } = req.query as unknown as {
    q: string;
    vehicleType?: VehicleType;
    limit: number;
  };
  ok(res, await catalogService.search(q, vehicleType, limit));
});

export const getFilters = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await catalogService.getFilters(req.params.vehicleType as VehicleType));
});

export const getHomeFeed = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogService.getHomeFeed());
});
