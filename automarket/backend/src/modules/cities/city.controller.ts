import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/respond';
import * as cityService from './city.service';

export const listCities = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as Parameters<typeof cityService.listCities>[0];
  ok(res, await cityService.listCities(query));
});

export const getCity = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await cityService.getCityBySlug(req.params.slug));
});
