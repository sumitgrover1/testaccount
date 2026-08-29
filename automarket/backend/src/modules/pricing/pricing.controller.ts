import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/respond';
import * as pricingService from './pricing.service';

export const getTeaser = asyncHandler(async (req: Request, res: Response) => {
  const { variantId, citySlug } = req.query as unknown as { variantId: string; citySlug: string };
  ok(res, await pricingService.getTeaser(variantId, citySlug));
});

export const createQuote = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as pricingService.QuoteWithLeadInput;
  created(res, await pricingService.createQuoteWithLead(body));
});

export const getQuote = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await pricingService.getQuote(req.params.id));
});
