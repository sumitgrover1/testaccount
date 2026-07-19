import { prisma } from '../../config/database';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  CreateBlogPostInput,
  ListBlogPostsQuery,
  UpdateBlogPostInput,
} from './blog.validation';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  // Small, bounded table — a loop here is simpler and clear enough than a
  // single clever query, and only runs on the rare title collision.
  for (;;) {
    const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function createBlogPost(input: CreateBlogPostInput, actingUserId: string) {
  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title);
  if (!baseSlug) throw new ConflictError('Could not derive a valid slug from the title');
  const slug = await generateUniqueSlug(baseSlug);

  const post = await prisma.blogPost.create({
    data: {
      title: input.title,
      slug,
      category: input.category,
      excerpt: input.excerpt,
      content: input.content,
      readTimeMinutes: input.readTimeMinutes,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? new Date() : null,
      createdById: actingUserId,
    },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'BLOG_POST_CREATED',
    resource: 'BlogPost',
    resourceId: post.id,
  });

  return post;
}

export async function getBlogPostById(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Blog post not found');
  return post;
}

export async function listBlogPosts(query: ListBlogPostsQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.isPublished !== undefined ? { isPublished: query.isPublished } : {}),
    ...(query.search ? { title: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function updateBlogPost(id: string, input: UpdateBlogPostInput, actingUserId: string) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Blog post not found');

  const { slug: requestedSlug, ...rest } = input;
  const slug = requestedSlug ? await generateUniqueSlug(slugify(requestedSlug), id) : undefined;

  // Only stamp publishedAt the moment a post transitions from unpublished to
  // published — re-saving an already-published post shouldn't bump its date.
  const isNewlyPublished = input.isPublished === true && !existing.isPublished;

  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      ...rest,
      ...(slug ? { slug } : {}),
      ...(isNewlyPublished ? { publishedAt: new Date() } : {}),
    },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'BLOG_POST_UPDATED',
    resource: 'BlogPost',
    resourceId: id,
    metadata: { changes: rest },
  });

  return updated;
}

export async function deleteBlogPost(id: string, actingUserId: string) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Blog post not found');

  await prisma.blogPost.delete({ where: { id } });

  await recordAudit({
    userId: actingUserId,
    action: 'BLOG_POST_DELETED',
    resource: 'BlogPost',
    resourceId: id,
  });
}

// Public, unauthenticated listing for the marketing website's Blog page —
// published posts only, ordered newest first.
export async function listPublicBlogPosts() {
  return prisma.blogPost.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      excerpt: true,
      readTimeMinutes: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  });
}

// Public, unauthenticated single-post fetch by slug for the website's
// article page. Returns null (not a 404 error) for unpublished/missing
// slugs, since the public controller treats "not found" as a plain 404
// without leaking whether an unpublished draft exists at that slug.
export async function getPublicBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      excerpt: true,
      content: true,
      readTimeMinutes: true,
      publishedAt: true,
    },
  });
}
