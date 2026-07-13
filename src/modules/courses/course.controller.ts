import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as courseService from './course.service';
import type {
  CreateCourseInput,
  IdParam,
  ListCoursesQuery,
  UpdateCourseInput,
} from './course.validation';

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCourseInput;
  const course = await courseService.createCourse(input, req.user!.id);
  res.status(201).json({ data: course });
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const course = await courseService.getCourseById(id, req.user);
  res.status(200).json({ data: course });
});

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCoursesQuery;
  const result = await courseService.listCourses(query, req.user);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateCourseInput;
  const course = await courseService.updateCourse(id, input, req.user!);
  res.status(200).json({ data: course });
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  await courseService.deleteCourse(id, req.user!);
  res.status(204).send();
});
