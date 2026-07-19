import { prisma } from '../../config/database';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  CreateBlogPostInput,
  ListBlogPostsQuery,
  PublicListBlogPostsQuery,
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

// Find-or-create each tag by its slug so re-using "Acne" on another post
// reuses the same BlogTag row instead of creating a duplicate.
async function resolveTagConnections(tagNames: string[] | undefined) {
  if (!tagNames || tagNames.length === 0) return undefined;
  const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
  const tags = await Promise.all(
    uniqueNames.map(async (name) => {
      const slug = slugify(name);
      return prisma.blogTag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
    }),
  );
  return tags.map((tag) => ({ id: tag.id }));
}

export async function createBlogPost(input: CreateBlogPostInput, actingUserId: string) {
  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title);
  if (!baseSlug) throw new ConflictError('Could not derive a valid slug from the title');
  const slug = await generateUniqueSlug(baseSlug);
  const tagConnections = await resolveTagConnections(input.tags);

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
      ...(tagConnections ? { tags: { connect: tagConnections } } : {}),
    },
    include: { tags: true },
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
  const post = await prisma.blogPost.findUnique({ where: { id }, include: { tags: true } });
  if (!post) throw new NotFoundError('Blog post not found');
  return post;
}

export async function listBlogPosts(query: ListBlogPostsQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.isPublished !== undefined ? { isPublished: query.isPublished } : {}),
    ...(query.search ? { title: { contains: query.search } } : {}),
    ...(query.tag ? { tags: { some: { slug: query.tag } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: { tags: true },
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

  const { slug: requestedSlug, tags: requestedTags, ...rest } = input;
  const slug = requestedSlug ? await generateUniqueSlug(slugify(requestedSlug), id) : undefined;
  const tagConnections = await resolveTagConnections(requestedTags);

  // Only stamp publishedAt the moment a post transitions from unpublished to
  // published — re-saving an already-published post shouldn't bump its date.
  const isNewlyPublished = input.isPublished === true && !existing.isPublished;

  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      ...rest,
      ...(slug ? { slug } : {}),
      ...(isNewlyPublished ? { publishedAt: new Date() } : {}),
      // `set` replaces the full tag list with the provided one, matching how
      // the admin form submits the complete current set rather than a diff.
      ...(tagConnections ? { tags: { set: tagConnections } } : {}),
    },
    include: { tags: true },
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
// published posts only, ordered newest first, paged (defaults to 10/page)
// and optionally filtered to one category and/or tag "subsection".
export async function listPublicBlogPosts(query: PublicListBlogPostsQuery) {
  const where = {
    isPublished: true,
    ...(query.category ? { category: query.category } : {}),
    ...(query.tag ? { tags: { some: { slug: query.tag } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        excerpt: true,
        readTimeMinutes: true,
        publishedAt: true,
        tags: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
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
      tags: { select: { name: true, slug: true } },
    },
  });
}

// Public, unauthenticated tag list for the website's "browse by topic"
// subsection nav — only tags attached to at least one published post, with
// a count so the website can show/hide sparse tags if it wants to.
export async function listPublicBlogTags() {
  const tags = await prisma.blogTag.findMany({
    where: { posts: { some: { isPublished: true } } },
    select: {
      name: true,
      slug: true,
      _count: { select: { posts: { where: { isPublished: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  return tags.map((tag) => ({ name: tag.name, slug: tag.slug, postCount: tag._count.posts }));
}
