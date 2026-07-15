import { LeadSource, LeadStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { formatSequenceCode } from '../../common/utils/sequenceCode';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import { toPatientCode } from '../patients/patient.service';
import type {
  ChangeLeadStatusInput,
  ConvertLeadInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from './lead.validation';

export function toLeadCode(leadNumber: number): string {
  return formatSequenceCode('LD', leadNumber);
}

function withLeadCode<T extends { leadNumber: number }>(lead: T): T & { leadCode: string } {
  return { ...lead, leadCode: toLeadCode(lead.leadNumber) };
}

interface IngestLeadInput {
  fullName: string;
  mobileNumber: string;
  email?: string;
  interestedTreatmentId?: string;
  source: LeadSource;
  campaignId?: string;
  assignedCounselorId?: string;
  notes?: string;
}

/// Shared entry point for every lead-capture path: the authenticated create
/// endpoint, the public website form, and the ad-platform webhooks (see
/// marketing.service.ts). Keeping ingestion in one place guarantees every lead
/// — regardless of source — gets the same initial status and history entry.
export async function ingestLead(input: IngestLeadInput, createdById?: string) {
  const lead = await prisma.lead.create({
    data: {
      fullName: input.fullName,
      mobileNumber: input.mobileNumber,
      email: input.email,
      interestedTreatmentId: input.interestedTreatmentId,
      source: input.source,
      campaignId: input.campaignId,
      assignedCounselorId: input.assignedCounselorId,
      notes: input.notes,
      status: LeadStatus.NEW,
    },
  });

  await prisma.leadStatusHistory.create({
    data: {
      leadId: lead.id,
      fromStatus: null,
      toStatus: LeadStatus.NEW,
      changedById: createdById,
      notes: 'Lead captured',
    },
  });

  if (createdById) {
    await recordAudit({
      userId: createdById,
      action: 'LEAD_CREATED',
      resource: 'Lead',
      resourceId: lead.id,
      metadata: { source: input.source },
    });
  }

  return withLeadCode(lead);
}

export async function createLead(input: CreateLeadInput, createdById: string) {
  return ingestLead(input, createdById);
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('Lead not found');
  return withLeadCode(lead);
}

export async function listLeads(query: ListLeadsQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.source ? { source: query.source } : {}),
    ...(query.assignedCounselorId ? { assignedCounselorId: query.assignedCounselorId } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search } },
            { mobileNumber: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items: items.map(withLeadCode),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function updateLead(id: string, input: UpdateLeadInput, actingUserId: string) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Lead not found');
  if (existing.status === LeadStatus.CONVERTED) {
    throw new ConflictError('Converted leads cannot be edited');
  }

  const updated = await prisma.lead.update({ where: { id }, data: input });

  await recordAudit({
    userId: actingUserId,
    action: 'LEAD_UPDATED',
    resource: 'Lead',
    resourceId: id,
    metadata: { changes: input },
  });

  return withLeadCode(updated);
}

const TERMINAL_STATUSES: LeadStatus[] = [
  LeadStatus.CONVERTED,
  LeadStatus.COLD,
  LeadStatus.LOST,
  LeadStatus.DUPLICATE,
  LeadStatus.INVALID,
  LeadStatus.NO_RESPONSE,
];

export async function changeLeadStatus(
  id: string,
  input: ChangeLeadStatusInput,
  actingUserId: string,
) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('Lead not found');

  if (lead.status === LeadStatus.CONVERTED) {
    throw new ConflictError('A converted lead is a permanent record and cannot change status');
  }
  if (input.status === LeadStatus.CONVERTED) {
    throw new BadRequestError('Use POST /leads/:id/convert to convert a lead to a patient');
  }

  const [updated] = await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: { status: input.status, lastFollowUpAt: new Date() },
    }),
    prisma.leadStatusHistory.create({
      data: {
        leadId: id,
        fromStatus: lead.status,
        toStatus: input.status,
        changedById: actingUserId,
        notes: input.notes,
      },
    }),
  ]);

  await recordAudit({
    userId: actingUserId,
    action: 'LEAD_STATUS_CHANGED',
    resource: 'Lead',
    resourceId: id,
    metadata: {
      from: lead.status,
      to: input.status,
      terminal: TERMINAL_STATUSES.includes(input.status),
    },
  });

  return withLeadCode(updated);
}

/// Converts a lead into a patient once it has purchased a treatment/package.
/// All communication and follow-up history stays attached to the lead record
/// (source/campaign attribution lives there) and is additionally backfilled
/// onto the new patient so it shows up in the patient's unified timeline.
export async function convertLead(id: string, input: ConvertLeadInput, actingUserId: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('Lead not found');
  if (lead.status === LeadStatus.CONVERTED || lead.convertedPatientId) {
    throw new ConflictError('This lead has already been converted to a patient');
  }

  const mobileNumber = input.mobileNumber ?? lead.mobileNumber;
  const existingPatient = await prisma.patient.findUnique({ where: { mobileNumber } });
  if (existingPatient) {
    throw new ConflictError('A patient with this mobile number already exists');
  }

  const result = await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.create({
      data: {
        fullName: input.fullName ?? lead.fullName,
        mobileNumber,
        email: input.email ?? lead.email,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        age: input.age,
        city: input.city,
        state: input.state,
        referralSource: lead.source,
        createdById: actingUserId,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id },
      data: {
        status: LeadStatus.CONVERTED,
        convertedPatientId: patient.id,
        convertedAt: new Date(),
      },
    });

    await tx.leadStatusHistory.create({
      data: {
        leadId: id,
        fromStatus: lead.status,
        toStatus: LeadStatus.CONVERTED,
        changedById: actingUserId,
        notes: 'Converted to patient',
      },
    });

    // Transfer/preserve full communication and follow-up history onto the
    // patient record so it appears in the patient's unified timeline, while
    // leaving leadId intact for historical lead-side reporting.
    await tx.communicationLog.updateMany({
      where: { leadId: id },
      data: { patientId: patient.id },
    });
    await tx.followUp.updateMany({ where: { leadId: id }, data: { patientId: patient.id } });

    return { patient, lead: updatedLead };
  });

  await recordAudit({
    userId: actingUserId,
    action: 'LEAD_CONVERTED',
    resource: 'Lead',
    resourceId: id,
    metadata: { patientId: result.patient.id },
  });

  return {
    lead: withLeadCode(result.lead),
    patient: { ...result.patient, patientCode: toPatientCode(result.patient.patientNumber) },
  };
}
