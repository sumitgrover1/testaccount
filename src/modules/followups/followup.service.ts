import { FollowUpStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import { notificationProvider } from '../../common/providers/notification.provider';
import type {
  CompleteFollowUpInput,
  CreateFollowUpInput,
  EscalateFollowUpInput,
  ListFollowUpsQuery,
} from './followup.validation';

const WITH_RELATIONS = {
  lead: { select: { id: true, fullName: true, mobileNumber: true } },
  patient: { select: { id: true, fullName: true, mobileNumber: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function createFollowUp(input: CreateFollowUpInput, createdById: string) {
  if (input.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw new NotFoundError('Lead not found');
  } else if (input.patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
  }

  const followUp = await prisma.followUp.create({
    data: { ...input, createdById },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: createdById,
    action: 'FOLLOWUP_CREATED',
    resource: 'FollowUp',
    resourceId: followUp.id,
  });

  return followUp;
}

export async function listFollowUps(query: ListFollowUpsQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    ...(query.overdue ? { status: FollowUpStatus.PENDING, dueAt: { lt: new Date() } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: WITH_RELATIONS,
      orderBy: { dueAt: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.followUp.count({ where }),
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

export async function completeFollowUp(id: string, input: CompleteFollowUpInput, actorId: string) {
  const followUp = await prisma.followUp.findUnique({ where: { id } });
  if (!followUp) throw new NotFoundError('Follow-up not found');
  if (followUp.status !== FollowUpStatus.PENDING) {
    throw new ConflictError('Only pending follow-ups can be completed');
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      status: FollowUpStatus.DONE,
      completedAt: new Date(),
      notes: input.notes ?? followUp.notes,
    },
    include: WITH_RELATIONS,
  });

  await prisma.communicationLog.create({
    data: {
      leadId: followUp.leadId,
      patientId: followUp.patientId,
      channel: followUp.channel,
      direction: 'OUTBOUND',
      content: input.notes ?? `Follow-up completed via ${followUp.channel}`,
      createdById: actorId,
    },
  });

  await recordAudit({
    userId: actorId,
    action: 'FOLLOWUP_COMPLETED',
    resource: 'FollowUp',
    resourceId: id,
  });
  return updated;
}

export async function escalateFollowUp(id: string, input: EscalateFollowUpInput, actorId: string) {
  const followUp = await prisma.followUp.findUnique({ where: { id } });
  if (!followUp) throw new NotFoundError('Follow-up not found');
  if (followUp.status !== FollowUpStatus.PENDING && followUp.status !== FollowUpStatus.MISSED) {
    throw new ConflictError('Only pending or missed follow-ups can be escalated');
  }

  const escalatedTo = await prisma.user.findUnique({ where: { id: input.escalatedToId } });
  if (!escalatedTo) throw new NotFoundError('Escalation target user not found');

  const updated = await prisma.followUp.update({
    where: { id },
    data: { escalatedToId: input.escalatedToId, notes: input.notes ?? followUp.notes },
    include: WITH_RELATIONS,
  });

  await recordAudit({
    userId: actorId,
    action: 'FOLLOWUP_ESCALATED',
    resource: 'FollowUp',
    resourceId: id,
    metadata: { escalatedToId: input.escalatedToId },
  });

  return updated;
}

/// Sends the reminder via the configured notification provider (console-only
/// stub today — see notification.provider.ts) for one follow-up. Intended to
/// be called on demand by staff, or in bulk by an external scheduler hitting
/// `sendDueReminders` — this codebase does not run its own cron/queue.
export async function sendReminder(id: string) {
  const followUp = await prisma.followUp.findUnique({
    where: { id },
    include: { lead: true, patient: true },
  });
  if (!followUp) throw new NotFoundError('Follow-up not found');

  const recipient = followUp.lead ?? followUp.patient;
  if (!recipient) throw new BadRequestError('Follow-up has no associated lead or patient');

  return notificationProvider.send({
    channel: followUp.channel,
    to: recipient.mobileNumber,
    message: followUp.notes ?? `Reminder: follow up with ${recipient.fullName}`,
  });
}

/// Bulk-marks any PENDING follow-up whose due time has passed as MISSED — the
/// counterpart to the `overdue` list filter, meant to run periodically from an
/// external scheduler since this codebase has no in-process cron.
export async function markOverdueAsMissed() {
  const result = await prisma.followUp.updateMany({
    where: { status: FollowUpStatus.PENDING, dueAt: { lt: new Date() } },
    data: { status: FollowUpStatus.MISSED },
  });
  return { updated: result.count };
}
