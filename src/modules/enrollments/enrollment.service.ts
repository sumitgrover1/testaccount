import { CourseStatus, EnrollmentStatus, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type { ListEnrollmentsQuery } from './enrollment.validation';

export async function enroll(studentId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw new NotFoundError('Course not found');
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (existing) {
    throw new ConflictError('Already enrolled in this course');
  }

  const enrollment = await prisma.enrollment.create({
    data: { studentId, courseId, status: EnrollmentStatus.ACTIVE },
  });

  await recordAudit({
    userId: studentId,
    action: 'ENROLLMENT_CREATED',
    resource: 'Enrollment',
    resourceId: enrollment.id,
    metadata: { courseId },
  });

  return enrollment;
}

export async function listMyEnrollments(studentId: string, query: ListEnrollmentsQuery) {
  const where = {
    studentId,
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: { course: { select: { id: true, title: true, slug: true, status: true } } },
      orderBy: { enrolledAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.enrollment.count({ where }),
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

export async function listCourseEnrollments(
  courseId: string,
  query: ListEnrollmentsQuery,
  actingUser: { id: string; role: Role },
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (actingUser.role !== Role.ADMIN && course.instructorId !== actingUser.id) {
    throw new ForbiddenError('You do not have permission to view enrollments for this course');
  }

  const where = {
    courseId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { enrolledAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.enrollment.count({ where }),
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

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus,
  actingUser: { id: string; role: Role },
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true },
  });
  if (!enrollment) throw new NotFoundError('Enrollment not found');

  const isOwner = enrollment.studentId === actingUser.id;
  const isCourseInstructor = enrollment.course.instructorId === actingUser.id;
  const isAdmin = actingUser.role === Role.ADMIN;

  // Students may only drop their own enrollment; only the course's instructor or
  // an admin may mark it completed.
  if (status === EnrollmentStatus.DROPPED && !isOwner && !isCourseInstructor && !isAdmin) {
    throw new ForbiddenError('You do not have permission to modify this enrollment');
  }
  if (status === EnrollmentStatus.COMPLETED && !isCourseInstructor && !isAdmin) {
    throw new ForbiddenError('You do not have permission to modify this enrollment');
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status, completedAt: status === EnrollmentStatus.COMPLETED ? new Date() : null },
  });

  await recordAudit({
    userId: actingUser.id,
    action: 'ENROLLMENT_STATUS_UPDATED',
    resource: 'Enrollment',
    resourceId: enrollmentId,
    metadata: { status },
  });

  return updated;
}
