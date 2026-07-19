import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as treatmentService from './treatment.service';
import type {
  CreateTreatmentInput,
  IdParam,
  ListTreatmentsQuery,
  UpdateTreatmentInput,
} from './treatment.validation';

export const createTreatment = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateTreatmentInput;
  const treatment = await treatmentService.createTreatment(input, req.user!.id);
  res.status(201).json({ data: treatment });
});

export const listPublicTreatments = asyncHandler(async (_req: Request, res: Response) => {
  const treatments = await treatmentService.listPublicTreatments();
  res.status(200).json({ data: treatments });
});

export const getTreatment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const treatment = await treatmentService.getTreatmentById(id);
  res.status(200).json({ data: treatment });
});

export const listTreatments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTreatmentsQuery;
  const result = await treatmentService.listTreatments(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateTreatment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateTreatmentInput;
  const treatment = await treatmentService.updateTreatment(id, input, req.user!.id);
  res.status(200).json({ data: treatment });
});

export const getTreatmentPriceHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const history = await treatmentService.getTreatmentPriceHistory(id);
  res.status(200).json({ data: history });
});
