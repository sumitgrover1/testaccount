import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as campaignService from './campaign.service';
import type {
  CreateCampaignInput,
  IdParam,
  ListCampaignsQuery,
  UpdateCampaignInput,
} from './campaign.validation';

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCampaignInput;
  const campaign = await campaignService.createCampaign(input, req.user!.id);
  res.status(201).json({ data: campaign });
});

export const getCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const campaign = await campaignService.getCampaignById(id);
  res.status(200).json({ data: campaign });
});

export const listCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCampaignsQuery;
  const result = await campaignService.listCampaigns(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateCampaignInput;
  const campaign = await campaignService.updateCampaign(id, input, req.user!.id);
  res.status(200).json({ data: campaign });
});

export const getCampaignPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const performance = await campaignService.getCampaignPerformance(id);
  res.status(200).json({ data: performance });
});
