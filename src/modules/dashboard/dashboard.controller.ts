import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as dashboardService from './dashboard.service';
import type { DateRangeQuery, TopTreatmentsQuery } from './dashboard.validation';

export const getLeadsSummary = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQuery;
  const data = await dashboardService.getLeadsSummary(query);
  res.status(200).json({ data });
});

export const getRevenueSummary = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQuery;
  const data = await dashboardService.getRevenueSummary(query);
  res.status(200).json({ data });
});

export const getAppointmentStats = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQuery;
  const data = await dashboardService.getAppointmentStats(query);
  res.status(200).json({ data });
});

export const getInventoryOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [value, lowStock] = await Promise.all([
    dashboardService.getInventoryValue(),
    dashboardService.getLowStockAlerts(),
  ]);
  res.status(200).json({ data: { ...value, lowStockAlerts: lowStock } });
});

export const getTopTreatments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as TopTreatmentsQuery;
  const data = await dashboardService.getTopTreatments(query);
  res.status(200).json({ data });
});

export const getCounselorPerformance = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQuery;
  const data = await dashboardService.getCounselorPerformance(query);
  res.status(200).json({ data });
});

export const getCampaignPerformance = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQuery;
  const data = await dashboardService.getCampaignPerformance(query);
  res.status(200).json({ data });
});
