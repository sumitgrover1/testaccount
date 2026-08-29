import type { Lead, LeadStatus, LeadType, Prisma, VehicleType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { logger } from '../../config/logger';

export interface CreateLeadInput {
  type: LeadType;
  fullName: string;
  phone: string;
  email?: string;
  citySlug?: string;
  consentToContact: boolean;
  vehicleType?: VehicleType;
  modelId?: string;
  variantId?: string;
  dealerId?: string;
  message?: string;
  preferredCallTime?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  source?: string;
  metadata?: Prisma.InputJsonValue;
}

// The contact block every public vertical form collects, without the fields the
// vertical itself fills in.
export type LeadContact = Omit<
  CreateLeadInput,
  'type' | 'metadata' | 'vehicleType' | 'modelId' | 'variantId' | 'dealerId' | 'source'
>;

// A shopper who checks the on-road price of three variants in one sitting is
// one lead, not three. Re-using the recent lead keeps the sales desk's queue
// meaningful and keeps per-lead payouts to dealers honest.
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const city = input.citySlug
    ? await prisma.city.findUnique({ where: { slug: input.citySlug }, select: { id: true } })
    : null;

  const metadata: Prisma.InputJsonValue = {
    ...(typeof input.metadata === 'object' && input.metadata !== null ? input.metadata : {}),
    ...(input.message ? { message: input.message } : {}),
    ...(input.preferredCallTime ? { preferredCallTime: input.preferredCallTime } : {}),
  };

  const existing = await prisma.lead.findFirst({
    where: {
      phone: input.phone,
      type: input.type,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName,
        email: input.email ?? existing.email,
        cityId: city?.id ?? existing.cityId,
        vehicleType: input.vehicleType ?? existing.vehicleType,
        modelId: input.modelId ?? existing.modelId,
        variantId: input.variantId ?? existing.variantId,
        dealerId: input.dealerId ?? existing.dealerId,
        metadata,
      },
    });
    await recordActivity(updated.id, null, 'LEAD_REPEAT_SUBMISSION', 'Same enquiry within 6 hours');
    return updated;
  }

  const lead = await prisma.lead.create({
    data: {
      type: input.type,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      cityId: city?.id,
      vehicleType: input.vehicleType,
      modelId: input.modelId,
      variantId: input.variantId,
      dealerId: input.dealerId,
      consentToContact: input.consentToContact,
      source: input.source ?? 'WEBSITE',
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      metadata,
    },
  });

  await recordActivity(lead.id, null, 'LEAD_CREATED', `Captured from ${lead.source}`);
  logger.info({ leadId: lead.id, type: lead.type }, 'Lead captured');
  return lead;
}

export async function recordActivity(
  leadId: string,
  actorId: string | null,
  action: string,
  note?: string,
): Promise<void> {
  await prisma.leadActivity.create({ data: { leadId, actorId, action, note } });
}

interface ListLeadsInput {
  type?: LeadType;
  status?: LeadStatus;
  vehicleType?: VehicleType;
  q?: string;
  assignedToId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export async function listLeads(input: ListLeadsInput) {
  const where: Prisma.LeadWhereInput = {
    ...(input.type ? { type: input.type } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
    ...(input.assignedToId ? { assignedToId: input.assignedToId } : {}),
    ...(input.from || input.to
      ? { createdAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } }
      : {}),
    ...(input.q
      ? {
          OR: [
            { fullName: { contains: input.q, mode: 'insensitive' } },
            { phone: { contains: input.q } },
            { email: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: {
        city: { select: { name: true, state: true } },
        model: { select: { name: true, brand: { select: { name: true } } } },
        variant: { select: { name: true, exShowroomPrice: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return {
    items,
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
    },
  };
}

export async function getLead(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      city: true,
      model: { include: { brand: true } },
      variant: true,
      dealer: true,
      assignedTo: { select: { id: true, fullName: true, email: true } },
      activities: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { fullName: true } } } },
      quotes: { orderBy: { createdAt: 'desc' } },
      loans: { include: { lender: { select: { name: true } } } },
      policies: { include: { insurer: { select: { name: true } } } },
    },
  });
  if (!lead) throw new NotFoundError('Lead not found');
  return lead;
}

export async function updateLead(
  id: string,
  actorId: string,
  input: { status?: LeadStatus; assignedToId?: string | null; dealerId?: string | null; note?: string },
) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('Lead not found');

  const closingStatuses: LeadStatus[] = ['CONVERTED', 'LOST', 'DUPLICATE'];

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
      ...(input.dealerId !== undefined ? { dealerId: input.dealerId } : {}),
      ...(input.status === 'CONTACTED' ? { lastContactedAt: new Date() } : {}),
      ...(input.status && closingStatuses.includes(input.status) ? { closedAt: new Date() } : {}),
    },
  });

  const changes = [
    input.status ? `status → ${input.status}` : null,
    input.assignedToId !== undefined ? 'reassigned' : null,
    input.dealerId !== undefined ? 'dealer updated' : null,
  ].filter(Boolean);

  await recordActivity(
    id,
    actorId,
    'LEAD_UPDATED',
    [changes.join(', '), input.note].filter(Boolean).join(' — ') || undefined,
  );

  return updated;
}
