import { EnrollmentStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import { getEffectivePrice } from '../pricing/pricing.service';
import { consumeForSession } from '../inventory/product.service';
import type {
  CreateEnrollmentInput,
  ListEnrollmentsQuery,
  RecordSessionInput,
} from './treatment-enrollment.validation';

const WITH_ITEMS = {
  items: { include: { treatment: true } },
  package: true,
  patient: true,
  assignedDoctor: { select: { id: true, firstName: true, lastName: true } },
  assignedTherapist: { select: { id: true, firstName: true, lastName: true } },
} as const;

const TERMINAL_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.COMPLETED,
  EnrollmentStatus.CANCELLED,
];

export async function createEnrollment(input: CreateEnrollmentInput, createdById: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  let itemsData: { treatmentId: string; sessionsTotal: number; price: number }[];
  let totalPrice = 0;
  let expiryDate = input.expiryDate;

  if (input.packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: input.packageId },
      include: { items: { include: { treatment: true } } },
    });
    if (!pkg || !pkg.isActive) throw new NotFoundError('Package not found or inactive');
    if (pkg.items.length === 0)
      throw new BadRequestError('This package has no treatments configured');

    itemsData = pkg.items.map((item) => ({
      treatmentId: item.treatmentId,
      sessionsTotal: item.quantity,
      price: 0, // package is priced as a unit; per-item price is informational only
    }));
    totalPrice = Number(pkg.defaultPrice);
    if (!expiryDate && pkg.validityDays) {
      expiryDate = new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000);
    }
  } else {
    const items = input.items ?? [];
    itemsData = await Promise.all(
      items.map(async (item) => {
        const treatment = await prisma.treatment.findUnique({ where: { id: item.treatmentId } });
        if (!treatment || !treatment.isActive) {
          throw new NotFoundError(`Treatment ${item.treatmentId} not found or inactive`);
        }
        const price =
          item.price ?? (await getEffectivePrice(input.patientId, item.treatmentId)).price;
        return {
          treatmentId: item.treatmentId,
          sessionsTotal: item.sessionsTotal ?? treatment.numberOfSessions,
          price,
        };
      }),
    );
    totalPrice = itemsData.reduce((sum, item) => sum + item.price, 0);
  }

  const enrollment = await prisma.treatmentEnrollment.create({
    data: {
      patientId: input.patientId,
      packageId: input.packageId,
      assignedDoctorId: input.assignedDoctorId,
      assignedTherapistId: input.assignedTherapistId,
      expiryDate,
      totalPrice,
      createdById,
      items: { create: itemsData },
    },
    include: WITH_ITEMS,
  });

  await recordAudit({
    userId: createdById,
    action: 'ENROLLMENT_CREATED',
    resource: 'TreatmentEnrollment',
    resourceId: enrollment.id,
    metadata: { patientId: input.patientId, packageId: input.packageId },
  });

  return enrollment;
}

export async function getEnrollmentById(id: string) {
  const enrollment = await prisma.treatmentEnrollment.findUnique({
    where: { id },
    include: WITH_ITEMS,
  });
  if (!enrollment) throw new NotFoundError('Enrollment not found');
  return enrollment;
}

export async function listEnrollments(query: ListEnrollmentsQuery) {
  const where = {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.assignedDoctorId ? { assignedDoctorId: query.assignedDoctorId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.treatmentEnrollment.findMany({
      where,
      include: WITH_ITEMS,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.treatmentEnrollment.count({ where }),
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
  id: string,
  status: EnrollmentStatus,
  actorId: string,
) {
  const enrollment = await prisma.treatmentEnrollment.findUnique({ where: { id } });
  if (!enrollment) throw new NotFoundError('Enrollment not found');
  if (TERMINAL_STATUSES.includes(enrollment.status)) {
    throw new ConflictError('This enrollment has already reached a terminal state');
  }

  const updated = await prisma.treatmentEnrollment.update({
    where: { id },
    data: { status },
    include: WITH_ITEMS,
  });

  await recordAudit({
    userId: actorId,
    action: 'ENROLLMENT_STATUS_UPDATED',
    resource: 'TreatmentEnrollment',
    resourceId: id,
    metadata: { from: enrollment.status, to: status },
  });

  return updated;
}

/// Records one performed session against an enrollment item: creates the
/// TreatmentSession, advances the session-progress counters, rolls the
/// item/enrollment status forward (PENDING -> RUNNING -> COMPLETED), and
/// auto-deducts stock for whatever products the treatment's default
/// bill-of-materials specifies (see inventory/product.service.ts).
export async function recordSession(
  enrollmentId: string,
  itemId: string,
  input: RecordSessionInput,
  performedById: string,
) {
  const item = await prisma.treatmentEnrollmentItem.findFirst({
    where: { id: itemId, enrollmentId },
    include: { enrollment: true },
  });
  if (!item) throw new NotFoundError('Enrollment item not found');
  if (item.status === EnrollmentStatus.COMPLETED || item.status === EnrollmentStatus.CANCELLED) {
    throw new ConflictError('This treatment item has already reached a terminal state');
  }
  if (item.sessionsCompleted >= item.sessionsTotal) {
    throw new ConflictError('All sessions for this treatment have already been completed');
  }

  const session = await prisma.treatmentSession.create({
    data: {
      enrollmentItemId: itemId,
      appointmentId: input.appointmentId,
      performedById,
      notes: input.notes,
    },
  });

  await consumeForSession(item.treatmentId, session.id, performedById);

  const sessionsCompleted = item.sessionsCompleted + 1;
  const itemStatus =
    sessionsCompleted >= item.sessionsTotal ? EnrollmentStatus.COMPLETED : EnrollmentStatus.RUNNING;

  await prisma.treatmentEnrollmentItem.update({
    where: { id: itemId },
    data: { sessionsCompleted, status: itemStatus },
  });

  const siblingItems = await prisma.treatmentEnrollmentItem.findMany({ where: { enrollmentId } });
  const allCompleted = siblingItems.every((sibling) =>
    sibling.id === itemId
      ? itemStatus === EnrollmentStatus.COMPLETED
      : sibling.status === EnrollmentStatus.COMPLETED,
  );
  const enrollmentStatus = allCompleted ? EnrollmentStatus.COMPLETED : EnrollmentStatus.RUNNING;
  if (
    item.enrollment.status !== enrollmentStatus &&
    !TERMINAL_STATUSES.includes(item.enrollment.status)
  ) {
    await prisma.treatmentEnrollment.update({
      where: { id: enrollmentId },
      data: { status: enrollmentStatus },
    });
  }

  await recordAudit({
    userId: performedById,
    action: 'TREATMENT_SESSION_RECORDED',
    resource: 'TreatmentSession',
    resourceId: session.id,
    metadata: { enrollmentId, itemId, sessionsCompleted },
  });

  return session;
}
