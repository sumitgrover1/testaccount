import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as pricingService from './pricing.service';
import type {
  GetEffectivePriceQuery,
  IdParam,
  ListPricingRequestsQuery,
  ReviewPricingRequestInput,
  SetPatientTreatmentPriceInput,
} from './pricing.validation';

export const getEffectivePrice = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, treatmentId } = req.query as unknown as GetEffectivePriceQuery;
  const result = await pricingService.getEffectivePrice(patientId, treatmentId);
  res.status(200).json({ data: result });
});

export const setPatientTreatmentPrice = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as SetPatientTreatmentPriceInput;
  const result = await pricingService.setPatientTreatmentPrice(input, req.user!.id, req.user!.role);
  res.status(result.applied ? 200 : 202).json({ data: result });
});

export const getPatientTreatmentPriceHistory = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, treatmentId } = req.query as unknown as GetEffectivePriceQuery;
  const history = await pricingService.getPatientTreatmentPriceHistory(patientId, treatmentId);
  res.status(200).json({ data: history });
});

export const listPricingRequests = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListPricingRequestsQuery;
  const result = await pricingService.listPricingRequests(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const reviewPricingRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as ReviewPricingRequestInput;
  const request = await pricingService.reviewPricingRequest(id, input, req.user!.id);
  res.status(200).json({ data: request });
});
