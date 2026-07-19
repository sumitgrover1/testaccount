import { apiClient } from './client';
import type { ApiEnvelope, BlogCategory, BlogPost, Paginated } from '@/types';

export interface BlogPostInput {
  title: string;
  slug?: string;
  category: BlogCategory;
  excerpt: string;
  content: string[];
  readTimeMinutes?: number;
  isPublished?: boolean;
}

export async function createBlogPost(input: BlogPostInput) {
  const res = await apiClient.post<ApiEnvelope<BlogPost>>('/blog', input);
  return res.data.data;
}

export async function listBlogPosts(params: {
  page?: number;
  limit?: number;
  category?: BlogCategory;
  isPublished?: boolean;
  search?: string;
}) {
  const res = await apiClient.get<Paginated<BlogPost>>('/blog', { params });
  return res.data;
}

export async function getBlogPost(id: string) {
  const res = await apiClient.get<ApiEnvelope<BlogPost>>(`/blog/${id}`);
  return res.data.data;
}

export async function updateBlogPost(id: string, input: Partial<BlogPostInput>) {
  const res = await apiClient.patch<ApiEnvelope<BlogPost>>(`/blog/${id}`, input);
  return res.data.data;
}

export async function deleteBlogPost(id: string) {
  await apiClient.delete(`/blog/${id}`);
}
