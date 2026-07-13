import sanitizeHtml from 'sanitize-html';
import { CourseStatus, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type { CreateCourseInput, ListCoursesQuery, UpdateCourseInput } from './course.validation';

// Restrictive allowlist: enough to support formatted course descriptions without
// permitting script/style injection or event-handler attributes.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'a'],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https'],
};

function sanitizeDescription(description: string): string {
  return sanitizeHtml(description, SANITIZE_OPTIONS);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 180);
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'course';
  let slug = base;
  let suffix = 1;
  // Bounded loop — course titles rarely collide more than a handful of times.
  while (await prisma.course.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function assertCanManage(
  course: { instructorId: string },
  actingUser: { id: string; role: Role },
): void {
  const isOwner = course.instructorId === actingUser.id;
  const isAdmin = actingUser.role === Role.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You do not have permission to manage this course');
  }
}

export async function createCourse(input: CreateCourseInput, instructorId: string) {
  const slug = await generateUniqueSlug(input.title);
  const course = await prisma.course.create({
    data: {
      title: input.title,
      description: sanitizeDescription(input.description),
      slug,
      instructorId,
      status: CourseStatus.DRAFT,
    },
  });

  await recordAudit({
    userId: instructorId,
    action: 'COURSE_CREATED',
    resource: 'Course',
    resourceId: course.id,
  });

  return course;
}

export async function getCourseById(id: string, actingUser?: { id: string; role: Role }) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');

  const isOwnerOrAdmin =
    actingUser && (actingUser.role === Role.ADMIN || actingUser.id === course.instructorId);

  // Students/anonymous users may only view published courses.
  if (course.status !== CourseStatus.PUBLISHED && !isOwnerOrAdmin) {
    throw new NotFoundError('Course not found');
  }

  return course;
}

export async function listCourses(
  query: ListCoursesQuery,
  actingUser?: { id: string; role: Role },
) {
  const isPrivileged = actingUser?.role === Role.ADMIN || actingUser?.role === Role.INSTRUCTOR;

  const where = {
    ...(query.status
      ? { status: query.status }
      : isPrivileged
        ? {}
        : { status: CourseStatus.PUBLISHED }),
    ...(actingUser?.role === Role.INSTRUCTOR ? { instructorId: actingUser.id } : {}),
    ...(query.search ? { title: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.course.count({ where }),
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

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
  actingUser: { id: string; role: Role },
) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  assertCanManage(course, actingUser);

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...input,
      ...(input.description ? { description: sanitizeDescription(input.description) } : {}),
    },
  });

  await recordAudit({
    userId: actingUser.id,
    action: 'COURSE_UPDATED',
    resource: 'Course',
    resourceId: id,
    metadata: { changes: { ...input, description: input.description ? '[sanitized]' : undefined } },
  });

  return updated;
}

export async function deleteCourse(id: string, actingUser: { id: string; role: Role }) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  assertCanManage(course, actingUser);

  await prisma.course.delete({ where: { id } });

  await recordAudit({
    userId: actingUser.id,
    action: 'COURSE_DELETED',
    resource: 'Course',
    resourceId: id,
  });
}
