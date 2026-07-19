import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type { CreateCommunicationLogInput } from './communication.validation';

export async function createCommunicationLog(
  input: CreateCommunicationLogInput,
  createdById: string,
) {
  if (input.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw new NotFoundError('Lead not found');
  } else if (input.patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
  }

  const log = await prisma.communicationLog.create({ data: { ...input, createdById } });

  await recordAudit({
    userId: createdById,
    action: 'COMMUNICATION_LOGGED',
    resource: 'CommunicationLog',
    resourceId: log.id,
  });

  return log;
}

interface TimelineEntry {
  type:
    'COMMUNICATION' | 'APPOINTMENT' | 'INVOICE' | 'TREATMENT_SESSION' | 'LEAD_STATUS' | 'FOLLOW_UP';
  occurredAt: Date;
  summary: string;
  data: unknown;
}

function sortByOccurredAtDesc(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

/// Merges every source of patient history into one chronological feed:
/// logged communications, appointments, invoices/payments, performed
/// treatment sessions, follow-ups, and — if this patient originated from a
/// lead — that lead's full status-change history (see lead.service.ts
/// convertLead, which preserves this attribution rather than duplicating it).
export async function getPatientTimeline(patientId: string): Promise<TimelineEntry[]> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  const [communications, appointments, invoices, sessions, followUps, originatingLead] =
    await Promise.all([
      prisma.communicationLog.findMany({ where: { patientId } }),
      prisma.appointment.findMany({ where: { patientId }, include: { treatment: true } }),
      prisma.invoice.findMany({ where: { patientId }, include: { payments: true } }),
      prisma.treatmentSession.findMany({
        where: { enrollmentItem: { enrollment: { patientId } } },
        include: { enrollmentItem: { include: { treatment: true } } },
      }),
      prisma.followUp.findMany({ where: { patientId } }),
      prisma.lead.findFirst({
        where: { convertedPatientId: patientId },
        include: { statusHistory: true },
      }),
    ]);

  const entries: TimelineEntry[] = [
    ...communications.map((c) => ({
      type: 'COMMUNICATION' as const,
      occurredAt: c.occurredAt,
      summary: `${c.channel} (${c.direction})`,
      data: c,
    })),
    ...appointments.map((a) => ({
      type: 'APPOINTMENT' as const,
      occurredAt: a.scheduledDate,
      summary: `Appointment (${a.status})${a.treatment ? ` — ${a.treatment.name}` : ''}`,
      data: a,
    })),
    ...invoices.map((i) => ({
      type: 'INVOICE' as const,
      occurredAt: i.createdAt,
      summary: `Invoice #${i.invoiceNumber} (${i.status}) — ${i.totalAmount}`,
      data: i,
    })),
    ...sessions.map((s) => ({
      type: 'TREATMENT_SESSION' as const,
      occurredAt: s.performedAt,
      summary: `Session performed — ${s.enrollmentItem.treatment.name}`,
      data: s,
    })),
    ...followUps.map((f) => ({
      type: 'FOLLOW_UP' as const,
      occurredAt: f.dueAt,
      summary: `Follow-up (${f.channel}) — ${f.status}`,
      data: f,
    })),
    ...(originatingLead?.statusHistory ?? []).map((h) => ({
      type: 'LEAD_STATUS' as const,
      occurredAt: h.changedAt,
      summary: `Lead status: ${h.fromStatus ?? 'NEW'} -> ${h.toStatus}`,
      data: h,
    })),
  ];

  return sortByOccurredAtDesc(entries);
}

export async function getLeadTimeline(leadId: string): Promise<TimelineEntry[]> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new NotFoundError('Lead not found');

  const [communications, statusHistory, followUps] = await Promise.all([
    prisma.communicationLog.findMany({ where: { leadId } }),
    prisma.leadStatusHistory.findMany({ where: { leadId } }),
    prisma.followUp.findMany({ where: { leadId } }),
  ]);

  const entries: TimelineEntry[] = [
    ...communications.map((c) => ({
      type: 'COMMUNICATION' as const,
      occurredAt: c.occurredAt,
      summary: `${c.channel} (${c.direction})`,
      data: c,
    })),
    ...statusHistory.map((h) => ({
      type: 'LEAD_STATUS' as const,
      occurredAt: h.changedAt,
      summary: `Lead status: ${h.fromStatus ?? 'NEW'} -> ${h.toStatus}`,
      data: h,
    })),
    ...followUps.map((f) => ({
      type: 'FOLLOW_UP' as const,
      occurredAt: f.dueAt,
      summary: `Follow-up (${f.channel}) — ${f.status}`,
      data: f,
    })),
  ];

  return sortByOccurredAtDesc(entries);
}
