import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/respond';
import * as leadService from './lead.service';

export const capturePublicLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.createLead(req.body as leadService.CreateLeadInput);
  // Public callers get an acknowledgement only — never the stored record, which
  // would let anyone read back another shopper's details by guessing an id.
  created(res, { id: lead.id, type: lead.type, status: lead.status });
});

export const listLeads = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as Parameters<typeof leadService.listLeads>[0];
  const { items, meta } = await leadService.listLeads(query);
  ok(res, items, meta);
});

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await leadService.getLead(req.params.id));
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Parameters<typeof leadService.updateLead>[2];
  ok(res, await leadService.updateLead(req.params.id, req.user!.id, body));
});
