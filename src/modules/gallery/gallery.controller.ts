import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as instagramService from './instagram.service';

export const getInstagramGallery = asyncHandler(async (_req: Request, res: Response) => {
  const result = await instagramService.getInstagramGallery();
  res.status(200).json({ data: result });
});
