import { PriceEntityType, PricingApprovalStatus, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { PRICING_APPROVER_ROLES } from '../../common/constants/roles';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  ListPricingRequestsQuery,
  ReviewPricingRequestInput,
  SetPatientTreatmentPriceInput,
} from './pricing.validation';

function patientTreatmentHistoryKey(patientId: string, treatmentId: string): string {
  return `${patientId}:${treatmentId}`;
}

function canApproveDirectly(role: Role): boolean {
  return (PRICING_APPROVER_ROLES as readonly Role[]).includes(role);
}

/// Pricing precedence: a patient-specific override always wins; otherwise the
/// treatment's default price applies. Package pricing is resolved separately
/// (Package.defaultPrice / discountPercent) since packages are priced as a unit.
export async function getEffectivePrice(patientId: string, treatmentId: string) {
  const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
  if (!treatment) throw new NotFoundError('Treatment not found');

  const override = await prisma.patientTreatmentPrice.findUnique({
    where: { patientId_treatmentId: { patientId, treatmentId } },
  });

  if (override) {
    return { price: Number(override.price), source: 'PATIENT_OVERRIDE' as const };
  }
  return { price: Number(treatment.defaultPrice), source: 'TREATMENT_DEFAULT' as const };
}

/// Applies (or requests approval for) a patient-specific treatment price.
/// Doctors/Clinic Owners/Super Admins can set any price directly; other roles
/// (e.g. counselors) can only go as low as PRICING_MAX_UNAPPROVED_DISCOUNT_PERCENT
/// below the treatment default before a PricingApprovalRequest is required.
export async function setPatientTreatmentPrice(
  input: SetPatientTreatmentPriceInput,
  actorId: string,
  actorRole: Role,
) {
  const [patient, treatment] = await Promise.all([
    prisma.patient.findUnique({ where: { id: input.patientId } }),
    prisma.treatment.findUnique({ where: { id: input.treatmentId } }),
  ]);
  if (!patient) throw new NotFoundError('Patient not found');
  if (!treatment) throw new NotFoundError('Treatment not found');

  const defaultPrice = Number(treatment.defaultPrice);
  const discountPercent =
    defaultPrice > 0 ? ((defaultPrice - input.price) / defaultPrice) * 100 : 0;
  const requiresApproval =
    !canApproveDirectly(actorRole) && discountPercent > env.PRICING_MAX_UNAPPROVED_DISCOUNT_PERCENT;

  if (requiresApproval) {
    const request = await prisma.pricingApprovalRequest.create({
      data: {
        requestedById: actorId,
        patientId: input.patientId,
        treatmentId: input.treatmentId,
        proposedPrice: input.price,
        thresholdPrice: defaultPrice * (1 - env.PRICING_MAX_UNAPPROVED_DISCOUNT_PERCENT / 100),
        reason: input.reason,
      },
    });

    await recordAudit({
      userId: actorId,
      action: 'PRICING_APPROVAL_REQUESTED',
      resource: 'PricingApprovalRequest',
      resourceId: request.id,
      metadata: {
        patientId: input.patientId,
        treatmentId: input.treatmentId,
        proposedPrice: input.price,
      },
    });

    return { applied: false as const, request };
  }

  const applied = await applyPatientTreatmentPrice(input, actorId);
  return { applied: true as const, price: applied };
}

/// Applies an approved (or directly authorized) patient-specific price and
/// records the change in the append-only price history.
async function applyPatientTreatmentPrice(input: SetPatientTreatmentPriceInput, actorId: string) {
  const existing = await prisma.patientTreatmentPrice.findUnique({
    where: {
      patientId_treatmentId: { patientId: input.patientId, treatmentId: input.treatmentId },
    },
  });

  const updated = await prisma.patientTreatmentPrice.upsert({
    where: {
      patientId_treatmentId: { patientId: input.patientId, treatmentId: input.treatmentId },
    },
    create: {
      patientId: input.patientId,
      treatmentId: input.treatmentId,
      price: input.price,
      createdById: actorId,
    },
    update: { price: input.price },
  });

  await prisma.priceHistory.create({
    data: {
      entityType: PriceEntityType.PATIENT_TREATMENT_PRICE,
      entityId: patientTreatmentHistoryKey(input.patientId, input.treatmentId),
      oldPrice: existing?.price,
      newPrice: input.price,
      changedById: actorId,
      reason: input.reason,
    },
  });

  await recordAudit({
    userId: actorId,
    action: 'PATIENT_TREATMENT_PRICE_SET',
    resource: 'PatientTreatmentPrice',
    resourceId: updated.id,
    metadata: { patientId: input.patientId, treatmentId: input.treatmentId, price: input.price },
  });

  return updated;
}

export async function reviewPricingRequest(
  requestId: string,
  input: ReviewPricingRequestInput,
  reviewerId: string,
) {
  const request = await prisma.pricingApprovalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError('Pricing approval request not found');
  if (request.status !== PricingApprovalStatus.PENDING) {
    throw new ConflictError('This pricing request has already been reviewed');
  }
  if (!request.treatmentId) {
    throw new BadRequestError('Package-level pricing requests are not yet supported for review');
  }

  const updated = await prisma.pricingApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: input.decision,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reason: input.reason ?? request.reason,
    },
  });

  if (input.decision === PricingApprovalStatus.APPROVED) {
    await applyPatientTreatmentPrice(
      {
        patientId: request.patientId,
        treatmentId: request.treatmentId,
        price: Number(request.proposedPrice),
        reason: input.reason ?? request.reason ?? undefined,
      },
      reviewerId,
    );
  }

  await recordAudit({
    userId: reviewerId,
    action: 'PRICING_APPROVAL_REVIEWED',
    resource: 'PricingApprovalRequest',
    resourceId: requestId,
    metadata: { decision: input.decision },
  });

  return updated;
}

export async function listPricingRequests(query: ListPricingRequestsQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.pricingApprovalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.pricingApprovalRequest.count({ where }),
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

export async function getPatientTreatmentPriceHistory(patientId: string, treatmentId: string) {
  return prisma.priceHistory.findMany({
    where: {
      entityType: PriceEntityType.PATIENT_TREATMENT_PRICE,
      entityId: patientTreatmentHistoryKey(patientId, treatmentId),
    },
    orderBy: { changedAt: 'desc' },
  });
}
