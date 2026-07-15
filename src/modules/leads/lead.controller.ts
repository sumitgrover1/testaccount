import type { Request, Response } from 'express';
import { LeadSource } from '@prisma/client';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as leadService from './lead.service';
import type {
  CapturePublicLeadInput,
  ChangeLeadStatusInput,
  ConvertLeadInput,
  CreateLeadInput,
  IdParam,
  ListLeadsQuery,
  UpdateLeadInput,
} from './lead.validation';

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateLeadInput;
  const lead = await leadService.createLead(input, req.user!.id);
  res.status(201).json({ data: lead });
});

export const capturePublicLead = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CapturePublicLeadInput;
  await leadService.ingestLead({ ...input, source: LeadSource.WEBSITE_FORM });
  // Deliberately generic response — never echo back internal lead IDs/state to
  // an unauthenticated caller.
  res.status(201).json({ data: { message: 'Thank you, our team will contact you shortly.' } });
});

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const lead = await leadService.getLeadById(id);
  res.status(200).json({ data: lead });
});

export const listLeads = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListLeadsQuery;
  const result = await leadService.listLeads(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateLeadInput;
  const lead = await leadService.updateLead(id, input, req.user!.id);
  res.status(200).json({ data: lead });
});

export const changeLeadStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as ChangeLeadStatusInput;
  const lead = await leadService.changeLeadStatus(id, input, req.user!.id);
  res.status(200).json({ data: lead });
});

export const convertLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as ConvertLeadInput;
  const result = await leadService.convertLead(id, input, req.user!.id);
  res.status(200).json({ data: result });
});
