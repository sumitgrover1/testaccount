import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as followUpService from './followup.service';
import type {
  CompleteFollowUpInput,
  CreateFollowUpInput,
  EscalateFollowUpInput,
  IdParam,
  ListFollowUpsQuery,
} from './followup.validation';

export const createFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateFollowUpInput;
  const followUp = await followUpService.createFollowUp(input, req.user!.id);
  res.status(201).json({ data: followUp });
});

export const listFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListFollowUpsQuery;
  const result = await followUpService.listFollowUps(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const completeFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as CompleteFollowUpInput;
  const followUp = await followUpService.completeFollowUp(id, input, req.user!.id);
  res.status(200).json({ data: followUp });
});

export const escalateFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as EscalateFollowUpInput;
  const followUp = await followUpService.escalateFollowUp(id, input, req.user!.id);
  res.status(200).json({ data: followUp });
});

export const sendReminder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const result = await followUpService.sendReminder(id);
  res.status(200).json({ data: result });
});

export const markOverdueAsMissed = asyncHandler(async (_req: Request, res: Response) => {
  const result = await followUpService.markOverdueAsMissed();
  res.status(200).json({ data: result });
});
