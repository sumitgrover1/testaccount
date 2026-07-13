import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as enrollmentService from './enrollment.service';
import type {
  EnrollInput,
  IdParam,
  ListEnrollmentsQuery,
  UpdateEnrollmentStatusInput,
} from './enrollment.validation';

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as EnrollInput;
  const enrollment = await enrollmentService.enroll(req.user!.id, input.courseId);
  res.status(201).json({ data: enrollment });
});

export const listMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListEnrollmentsQuery;
  const result = await enrollmentService.listMyEnrollments(req.user!.id, query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const listCourseEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const { id: courseId } = req.params as unknown as { id: string };
  const query = req.query as unknown as ListEnrollmentsQuery;
  const result = await enrollmentService.listCourseEnrollments(courseId, query, req.user!);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateEnrollmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateEnrollmentStatusInput;
  const enrollment = await enrollmentService.updateEnrollmentStatus(id, input.status, req.user!);
  res.status(200).json({ data: enrollment });
});
