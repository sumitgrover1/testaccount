import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/respond';
import * as dashboardService from './dashboard.service';

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await dashboardService.getOverview());
});
