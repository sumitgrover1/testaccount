'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import * as blogApi from '@/lib/api/blog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { titleCase } from '@/lib/utils/format';
import type { BlogPost } from '@/types';

const CATEGORY_OPTIONS = [
  { label: 'Skin', value: 'SKIN' },
  { label: 'Hair', value: 'HAIR' },
  { label: 'Weight Management', value: 'WEIGHT_MANAGEMENT' },
  { label: 'General', value: 'GENERAL' },
];

const schema = z.object({
  title: z.string().min(1, 'Required'),
  slug: z.string().optional(),
  category: z.enum(['SKIN', 'HAIR', 'WEIGHT_MANAGEMENT', 'GENERAL']),
  excerpt: z.string().min(1, 'Required'),
  content: z.string().min(1, 'Required'),
  readTimeMinutes: z.coerce.number().int().positive().default(4),
  isPublished: z.boolean().default(false),
});
type FormValues = z.infer<typeof schema>;

function contentToParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function BlogPostFormModal({
  open,
  onClose,
  post,
}: {
  open: boolean;
  onClose: () => void;
  post?: BlogPost;
}) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: post
      ? {
          title: post.title,
          slug: post.slug,
          category: post.category,
          excerpt: post.excerpt,
          content: post.content.join('\n\n'),
          readTimeMinutes: post.readTimeMinutes,
          isPublished: post.isPublished,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input = { ...values, content: contentToParagraphs(values.content) };
      return post ? blogApi.updateBlogPost(post.id, input) : blogApi.createBlogPost(input);
    },
    onSuccess: () => {
      showSuccess(post ? 'Article updated' : 'Article created');
      void queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      reset();
      onClose();
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to save article')),
  });

  return (
    <Modal open={open} onClose={onClose} title={post ? 'Edit article' : 'New article'} size="lg">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <Input label="Title" error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            error={errors.category?.message}
            {...register('category')}
          />
          <Input
            label="Read time (minutes)"
            type="number"
            error={errors.readTimeMinutes?.message}
            {...register('readTimeMinutes')}
          />
        </div>
        <Input label="Slug (optional — auto-generated from title if blank)" error={errors.slug?.message} {...register('slug')} />
        <Textarea label="Excerpt" rows={2} error={errors.excerpt?.message} {...register('excerpt')} />
        <Textarea
          label="Content (separate paragraphs with a blank line)"
          rows={12}
          error={errors.content?.message}
          {...register('content')}
        />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('isPublished')} />
          Published
        </label>
        <div className="flex justify-end">
          <Button type="submit" isLoading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function BlogPage() {
  const [formPost, setFormPost] = useState<BlogPost | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => blogApi.listBlogPosts({ limit: 100 }),
  });

  const togglePublishedMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      blogApi.updateBlogPost(id, { isPublished }),
    onSuccess: () => {
      showSuccess('Article updated');
      void queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
    onError: (err) => showError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.deleteBlogPost(id),
    onSuccess: () => {
      showSuccess('Article deleted');
      void queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to delete article')),
  });

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Educational articles shown on the public website"
        action={
          <Button
            onClick={() => {
              setFormPost(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New Article
          </Button>
        }
      />

      <Card>
        <Table
          columns={[
            { header: 'Title', accessor: (r) => r.title },
            { header: 'Category', accessor: (r) => titleCase(r.category) },
            { header: 'Read time', accessor: (r) => `${r.readTimeMinutes} min` },
            { header: 'Status', accessor: (r) => <Badge status={r.isPublished ? 'PUBLISHED' : 'DRAFT'} /> },
            {
              header: '',
              accessor: (r) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormPost(r);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublishedMutation.mutate({ id: r.id, isPublished: !r.isPublished })}
                  >
                    {r.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Delete "${r.title}"? This cannot be undone.`)) {
                        deleteMutation.mutate(r.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </div>
              ),
            },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No articles yet"
        />
      </Card>

      <BlogPostFormModal open={formOpen} onClose={() => setFormOpen(false)} post={formPost} />
    </div>
  );
}
