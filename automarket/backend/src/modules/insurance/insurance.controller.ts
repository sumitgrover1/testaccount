import type { Request, Response } from 'express';
import type { InsuranceApplicationStatus, VehicleType } from '@prisma/client';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/respond';
import * as insuranceService from './insurance.service';

export const listInsurers = asyncHandler(async (req: Request, res: Response) => {
  const { vehicleType } = req.query as unknown as { vehicleType?: VehicleType };
  ok(res, await insuranceService.listInsurers(vehicleType));
});

export const listAddOns = asyncHandler(async (req: Request, res: Response) => {
  const { vehicleType } = req.query as unknown as { vehicleType: VehicleType };
  ok(res, await insuranceService.listAddOns(vehicleType));
});

export const getQuotes = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await insuranceService.getQuotes(req.body as insuranceService.QuoteInput));
});

export const apply = asyncHandler(async (req: Request, res: Response) => {
  created(res, await insuranceService.applyForPolicy(req.body as insuranceService.ApplyInput));
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as Parameters<typeof insuranceService.listApplications>[0];
  const { items, meta } = await insuranceService.listApplications(query);
  ok(res, items, meta);
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: InsuranceApplicationStatus };
  ok(res, await insuranceService.updateApplicationStatus(req.params.id, req.user!.id, status));
});
