import type { Request, Response } from 'express';
import type { LoanApplicationStatus } from '@prisma/client';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/respond';
import * as financeService from './finance.service';

export const calculateEmi = asyncHandler(async (req: Request, res: Response) => {
  const { principal, interestRate, tenureMonths, includeSchedule } = req.body as {
    principal: number;
    interestRate: number;
    tenureMonths: number;
    includeSchedule?: boolean;
  };
  ok(res, financeService.calculateEmi(principal, interestRate, tenureMonths, includeSchedule));
});

export const listOffers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as Parameters<typeof financeService.listOffers>[0];
  ok(res, await financeService.listOffers(query));
});

export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await financeService.checkEligibility(req.body as financeService.EligibilityInput));
});

export const apply = asyncHandler(async (req: Request, res: Response) => {
  created(res, await financeService.applyForLoan(req.body as financeService.ApplyInput));
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as Parameters<typeof financeService.listApplications>[0];
  const { items, meta } = await financeService.listApplications(query);
  ok(res, items, meta);
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const { status, rejectionReason } = req.body as {
    status: LoanApplicationStatus;
    rejectionReason?: string;
  };
  ok(
    res,
    await financeService.updateApplicationStatus(req.params.id, req.user!.id, status, rejectionReason),
  );
});
