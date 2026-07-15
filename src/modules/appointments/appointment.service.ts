import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  CancelAppointmentInput,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from './appointment.validation';

const WITH_RELATIONS = {
  patient: { select: { id: true, fullName: true, mobileNumber: true } },
  doctor: { select: { id: true, firstName: true, lastName: true } },
  treatment: { select: { id: true, name: true } },
} as const;

export async function createAppointment(input: CreateAppointmentInput, createdById: string) {
  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: input.patientId } }),
    prisma.user.findUnique({ where: { id: input.doctorId } }),
  ]);
  if (!patient) throw new NotFoundError('Patient not found');
  if (!doctor) throw new NotFoundError('Doctor not found');

  const appointment = await prisma.appointment.create({
    data: { ...input, createdById },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: createdById,
    action: 'APPOINTMENT_CREATED',
    resource: 'Appointment',
    resourceId: appointment.id,
  });

  return appointment;
}

export async function getAppointmentById(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: WITH_RELATIONS,
  });
  if (!appointment) throw new NotFoundError('Appointment not found');
  return appointment;
}

export async function listAppointments(query: ListAppointmentsQuery) {
  const where = {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.doctorId ? { doctorId: query.doctorId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.fromDate || query.toDate
      ? {
          scheduledDate: {
            ...(query.fromDate ? { gte: query.fromDate } : {}),
            ...(query.toDate ? { lte: query.toDate } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: WITH_RELATIONS,
      orderBy: { scheduledDate: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.appointment.count({ where }),
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

function assertMutable(status: AppointmentStatus): void {
  if (status !== AppointmentStatus.BOOKED) {
    throw new ConflictError('Only appointments still in BOOKED status can be modified this way');
  }
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
  actorId: string,
) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFoundError('Appointment not found');
  assertMutable(appointment.status);

  const updated = await prisma.appointment.update({
    where: { id },
    data: input,
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: actorId,
    action: 'APPOINTMENT_UPDATED',
    resource: 'Appointment',
    resourceId: id,
    metadata: { changes: input },
  });

  return updated;
}

export async function checkInAppointment(id: string, actorId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFoundError('Appointment not found');
  if (appointment.status !== AppointmentStatus.BOOKED) {
    throw new ConflictError('Only booked appointments can be checked in');
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: AppointmentStatus.CHECKED_IN, checkedInAt: new Date() },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: actorId,
    action: 'APPOINTMENT_CHECKED_IN',
    resource: 'Appointment',
    resourceId: id,
  });
  return updated;
}

export async function completeAppointment(id: string, actorId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFoundError('Appointment not found');
  if (appointment.status !== AppointmentStatus.CHECKED_IN) {
    throw new ConflictError('Only checked-in appointments can be marked completed');
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: AppointmentStatus.COMPLETED, completedAt: new Date() },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: actorId,
    action: 'APPOINTMENT_COMPLETED',
    resource: 'Appointment',
    resourceId: id,
  });
  return updated;
}

export async function cancelAppointment(
  id: string,
  input: CancelAppointmentInput,
  actorId: string,
) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFoundError('Appointment not found');
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    throw new ConflictError('This appointment cannot be cancelled from its current status');
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      notes: input.reason
        ? `${appointment.notes ?? ''}\nCancelled: ${input.reason}`.trim()
        : appointment.notes,
    },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: actorId,
    action: 'APPOINTMENT_CANCELLED',
    resource: 'Appointment',
    resourceId: id,
    metadata: { reason: input.reason },
  });
  return updated;
}

export async function markNoShow(id: string, actorId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFoundError('Appointment not found');
  if (appointment.status !== AppointmentStatus.BOOKED) {
    throw new ConflictError('Only booked appointments can be marked as no-show');
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: AppointmentStatus.NO_SHOW },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: actorId,
    action: 'APPOINTMENT_NO_SHOW',
    resource: 'Appointment',
    resourceId: id,
  });
  return updated;
}

/// Reschedule creates a new appointment row (preserving the original as an
/// immutable historical record) and links the two via rescheduledFromId, so
/// the full reschedule chain stays auditable.
export async function rescheduleAppointment(
  id: string,
  input: RescheduleAppointmentInput,
  actorId: string,
) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFoundError('Appointment not found');
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    throw new BadRequestError('This appointment cannot be rescheduled from its current status');
  }

  const [, newAppointment] = await prisma.$transaction([
    prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.RESCHEDULED } }),
    prisma.appointment.create({
      data: {
        patientId: appointment.patientId,
        doctorId: input.doctorId ?? appointment.doctorId,
        treatmentId: appointment.treatmentId,
        scheduledDate: input.scheduledDate,
        notes: input.notes ?? appointment.notes,
        createdById: actorId,
        rescheduledFromId: id,
      },
      include: WITH_RELATIONS,
    }),
  ]);

  await recordAudit({
    userId: actorId,
    action: 'APPOINTMENT_RESCHEDULED',
    resource: 'Appointment',
    resourceId: id,
    metadata: { newAppointmentId: newAppointment.id },
  });

  return newAppointment;
}
