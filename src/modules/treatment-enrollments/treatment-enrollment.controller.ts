import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as enrollmentService from './treatment-enrollment.service';
import type {
  CreateEnrollmentInput,
  IdParam,
  ItemIdParam,
  ListEnrollmentsQuery,
  RecordSessionInput,
  UpdateEnrollmentStatusInput,
} from './treatment-enrollment.validation';

export const createEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateEnrollmentInput;
  const enrollment = await enrollmentService.createEnrollment(input, req.user!.id);
  res.status(201).json({ data: enrollment });
});

export const getEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const enrollment = await enrollmentService.getEnrollmentById(id);
  res.status(200).json({ data: enrollment });
});

export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListEnrollmentsQuery;
  const result = await enrollmentService.listEnrollments(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateEnrollmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateEnrollmentStatusInput;
  const enrollment = await enrollmentService.updateEnrollmentStatus(id, input.status, req.user!.id);
  res.status(200).json({ data: enrollment });
});

export const recordSession = asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params as unknown as ItemIdParam;
  const input = req.body as RecordSessionInput;
  const session = await enrollmentService.recordSession(id, itemId, input, req.user!.id);
  res.status(201).json({ data: session });
});
