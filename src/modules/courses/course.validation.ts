import { CourseStatus } from '@prisma/client';
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});
export type IdParam = z.infer<typeof idParamSchema>;

const title = z.string().trim().min(3).max(200);
// Raw HTML is accepted here but sanitized server-side (see course.service.ts)
// before it is ever persisted or returned — defense against stored XSS from
// instructor-authored rich text content.
const description = z.string().max(20_000);

export const createCourseSchema = z.object({
  title,
  description,
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    status: z.nativeEnum(CourseStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(CourseStatus).optional(),
  search: z.string().trim().max(200).optional(),
});
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
