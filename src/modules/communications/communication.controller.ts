import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as communicationService from './communication.service';
import type { CreateCommunicationLogInput, IdParam } from './communication.validation';

export const createCommunicationLog = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCommunicationLogInput;
  const log = await communicationService.createCommunicationLog(input, req.user!.id);
  res.status(201).json({ data: log });
});

export const getPatientTimeline = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const timeline = await communicationService.getPatientTimeline(id);
  res.status(200).json({ data: timeline });
});

export const getLeadTimeline = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const timeline = await communicationService.getLeadTimeline(id);
  res.status(200).json({ data: timeline });
});
