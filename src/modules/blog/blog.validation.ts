import { BlogCategory } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema, uuidParamSchema } from '../../common/validation/primitives';

export const idParamSchema = uuidParamSchema;
export type IdParam = z.infer<typeof idParamSchema>;

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(220)
    .regex(/^[a-z0-9-]+$/, 'Invalid slug'),
});
export type SlugParam = z.infer<typeof slugParamSchema>;

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  // Optional: auto-generated from the title if omitted (see blog.service.ts).
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(220)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  category: z.nativeEnum(BlogCategory),
  excerpt: z.string().trim().min(1).max(500),
  content: z.array(z.string().trim().min(1)).min(1, 'At least one paragraph is required'),
  readTimeMinutes: z.coerce.number().int().positive().max(120).default(4),
  isPublished: z.boolean().default(false),
});
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(220)
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
      .optional(),
    category: z.nativeEnum(BlogCategory).optional(),
    excerpt: z.string().trim().min(1).max(500).optional(),
    content: z.array(z.string().trim().min(1)).min(1).optional(),
    readTimeMinutes: z.coerce.number().int().positive().max(120).optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields provided to update' });
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

export const listBlogPostsQuerySchema = paginationSchema.extend({
  category: z.nativeEnum(BlogCategory).optional(),
  isPublished: z.coerce.boolean().optional(),
  search: z.string().trim().max(150).optional(),
});
export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;
