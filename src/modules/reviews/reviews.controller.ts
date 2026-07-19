import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as reviewsService from './reviews.service';

export const getGoogleReviews = asyncHandler(async (_req: Request, res: Response) => {
  const result = await reviewsService.getGoogleReviews();
  res.status(200).json({ data: result });
});
