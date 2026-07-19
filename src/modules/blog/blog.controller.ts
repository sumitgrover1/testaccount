import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { NotFoundError } from '../../common/errors/AppError';
import * as blogService from './blog.service';
import type {
  CreateBlogPostInput,
  IdParam,
  ListBlogPostsQuery,
  SlugParam,
  UpdateBlogPostInput,
} from './blog.validation';

export const createBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateBlogPostInput;
  const post = await blogService.createBlogPost(input, req.user!.id);
  res.status(201).json({ data: post });
});

export const listPublicBlogPosts = asyncHandler(async (_req: Request, res: Response) => {
  const posts = await blogService.listPublicBlogPosts();
  res.status(200).json({ data: posts });
});

export const getPublicBlogPostBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params as unknown as SlugParam;
  const post = await blogService.getPublicBlogPostBySlug(slug);
  if (!post) throw new NotFoundError('Blog post not found');
  res.status(200).json({ data: post });
});

export const getBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const post = await blogService.getBlogPostById(id);
  res.status(200).json({ data: post });
});

export const listBlogPosts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListBlogPostsQuery;
  const result = await blogService.listBlogPosts(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateBlogPostInput;
  const post = await blogService.updateBlogPost(id, input, req.user!.id);
  res.status(200).json({ data: post });
});

export const deleteBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  await blogService.deleteBlogPost(id, req.user!.id);
  res.status(204).send();
});
