import type {
  InsuranceApplicationStatus,
  PolicyType,
  Prisma,
  VehicleType,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import * as leads from '../leads/lead.service';

// IRDAI depreciation grid used to derive Insured Declared Value from the
// vehicle's showroom price. Beyond 5 years the IDV is "mutually agreed"; the
// last row is the house default, which an agent can still override per quote.
const DEPRECIATION_BY_AGE: { maxAgeYears: number; percent: number }[] = [
  { maxAgeYears: 0.5, percent: 5 },
  { maxAgeYears: 1, percent: 15 },
  { maxAgeYears: 2, percent: 20 },
  { maxAgeYears: 3, percent: 30 },
  { maxAgeYears: 4, percent: 40 },
  { maxAgeYears: 5, percent: 50 },
  { maxAgeYears: Number.POSITIVE_INFINITY, percent: 60 },
];

// Compulsory owner-driver personal accident cover, priced by IRDAI.
const PA_COVER_PREMIUM = 750;

function depreciationPercent(ageYears: number): number {
  return DEPRECIATION_BY_AGE.find((row) => ageYears <= row.maxAgeYears)?.percent ?? 60;
}

export interface QuoteInput {
  vehicleType: VehicleType;
  policyType: PolicyType;
  modelId?: string;
  variantId?: string;
  vehicleValue?: number;
  engineCc?: number;
  registrationYear: number;
  registrationNo?: string;
  isNewVehicle: boolean;
  ncbPercent: number;
  claimedLastYear: boolean;
  previousPolicyExpiry?: Date;
  addOnSlugs: string[];
  idv?: number;
}

export interface PlanQuote {
  planId: string;
  planName: string;
  insurer: { id: string; slug: string; name: string; logoUrl: string | null; claimSettlementRatio: number; cashlessGarages: number };
  policyType: PolicyType;
  idv: number;
  odPremium: number;
  ncbDiscount: number;
  addOnPremium: number;
  tpPremium: number;
  paCover: number;
  netPremium: number;
  gstAmount: number;
  totalPremium: number;
  keyBenefits: string[];
  addOns: { slug: string; name: string; premium: number }[];
  breakup: { key: string; label: string; amount: number; note?: string }[];
}

async function resolveVehicleBasis(input: QuoteInput) {
  if (input.variantId) {
    const variant = await prisma.variant.findUnique({
      where: { id: input.variantId },
      include: { model: { select: { id: true, name: true, vehicleType: true, brand: { select: { name: true } } } } },
    });
    if (!variant) throw new NotFoundError('Variant not found');
    return {
      showroomValue: Number(variant.exShowroomPrice),
      engineCc: variant.engineCc ?? input.engineCc ?? 0,
      modelId: variant.model.id,
      variantId: variant.id,
      vehicleType: variant.model.vehicleType,
      label: `${variant.model.brand.name} ${variant.model.name} ${variant.name}`,
    };
  }

  if (!input.vehicleValue) {
    throw new BadRequestError('Provide either a variantId or the vehicle value to price a policy');
  }

  return {
    showroomValue: input.vehicleValue,
    engineCc: input.engineCc ?? 0,
    modelId: input.modelId,
    variantId: undefined,
    vehicleType: input.vehicleType,
    label: 'Vehicle',
  };
}

async function thirdPartyPremium(vehicleType: VehicleType, engineCc: number): Promise<number> {
  const rate = await prisma.thirdPartyRate.findFirst({
    where: { vehicleType, ccMin: { lte: engineCc }, ccMax: { gte: engineCc } },
  });
  const fallback = await prisma.thirdPartyRate.findFirst({
    where: { vehicleType },
    orderBy: { annualPremium: 'desc' },
  });
  return Number(rate?.annualPremium ?? fallback?.annualPremium ?? 0);
}

export async function getQuotes(input: QuoteInput): Promise<{
  vehicle: { label: string; idv: number; ageYears: number; depreciationPercent: number; engineCc: number };
  quotes: PlanQuote[];
}> {
  const basis = await resolveVehicleBasis(input);

  const ageYears = Math.max(0, new Date().getFullYear() - input.registrationYear);
  const depreciation = input.isNewVehicle ? 5 : depreciationPercent(ageYears);
  const derivedIdv = Math.round((basis.showroomValue * (100 - depreciation)) / 100);
  const idv = input.idv ?? derivedIdv;

  // A claim in the previous policy year resets No Claim Bonus to zero — quoting
  // otherwise would produce a premium the insurer will not honour.
  const effectiveNcb = input.claimedLastYear ? 0 : input.ncbPercent;

  const [plans, addOns, tpPremium] = await Promise.all([
    prisma.insurancePlan.findMany({
      where: {
        vehicleType: basis.vehicleType,
        policyType: input.policyType,
        isActive: true,
        insurer: { isActive: true },
      },
      include: { insurer: true },
    }),
    prisma.insuranceAddOn.findMany({
      where: { vehicleType: basis.vehicleType, slug: { in: input.addOnSlugs } },
      orderBy: { sortOrder: 'asc' },
    }),
    thirdPartyPremium(basis.vehicleType, basis.engineCc),
  ]);

  const quotes: PlanQuote[] = plans.map((plan) => {
    const odPremium =
      input.policyType === 'THIRD_PARTY' ? 0 : Math.round((idv * plan.odRatePercent) / 100);
    const ncbDiscount = Math.round((odPremium * effectiveNcb) / 100);
    const odAfterNcb = odPremium - ncbDiscount;

    // Add-ons load onto the own-damage premium, which is how motor policies
    // actually price them; a third-party-only policy cannot carry them.
    const pricedAddOns = (input.policyType === 'THIRD_PARTY' ? [] : addOns)
      .filter((addOn) => !(addOn.slug === 'zero-depreciation' && plan.zeroDepIncluded))
      .map((addOn) => ({
        slug: addOn.slug,
        name: addOn.name,
        premium: Math.round((odPremium * addOn.ratePercent) / 100),
      }));
    const addOnPremium = pricedAddOns.reduce((sum, addOn) => sum + addOn.premium, 0);

    const tp = input.policyType === 'OWN_DAMAGE' ? 0 : tpPremium;
    const netPremium = odAfterNcb + addOnPremium + tp + PA_COVER_PREMIUM;
    const gstAmount = Math.round((netPremium * env.INSURANCE_GST_PERCENT) / 100);

    return {
      planId: plan.id,
      planName: plan.name,
      insurer: {
        id: plan.insurer.id,
        slug: plan.insurer.slug,
        name: plan.insurer.name,
        logoUrl: plan.insurer.logoUrl,
        claimSettlementRatio: plan.insurer.claimSettlementRatio,
        cashlessGarages: plan.insurer.cashlessGarages,
      },
      policyType: plan.policyType,
      idv,
      odPremium,
      ncbDiscount,
      addOnPremium,
      tpPremium: tp,
      paCover: PA_COVER_PREMIUM,
      netPremium,
      gstAmount,
      totalPremium: netPremium + gstAmount,
      keyBenefits: plan.keyBenefits,
      addOns: pricedAddOns,
      breakup: [
        { key: 'od', label: 'Own damage premium', amount: odPremium, note: `${plan.odRatePercent}% of IDV` },
        ...(ncbDiscount > 0
          ? [{ key: 'ncb', label: `No Claim Bonus (${effectiveNcb}%)`, amount: -ncbDiscount }]
          : []),
        ...pricedAddOns.map((addOn) => ({
          key: `addon-${addOn.slug}`,
          label: addOn.name,
          amount: addOn.premium,
        })),
        ...(tp > 0 ? [{ key: 'tp', label: 'Third party premium', amount: tp, note: 'IRDAI regulated' }] : []),
        { key: 'pa', label: 'Owner-driver personal accident cover', amount: PA_COVER_PREMIUM },
        { key: 'gst', label: `GST (${env.INSURANCE_GST_PERCENT}%)`, amount: gstAmount },
      ],
    };
  });

  quotes.sort((a, b) => a.totalPremium - b.totalPremium);

  return {
    vehicle: {
      label: basis.label,
      idv,
      ageYears,
      depreciationPercent: depreciation,
      engineCc: basis.engineCc,
    },
    quotes,
  };
}

export interface ApplyInput extends QuoteInput {
  planId: string;
  contact: leads.LeadContact;
}

export async function applyForPolicy(input: ApplyInput) {
  const { vehicle, quotes } = await getQuotes(input);
  const selected = quotes.find((quote) => quote.planId === input.planId);
  if (!selected) throw new NotFoundError('Selected plan is not available for this vehicle');

  const lead = await leads.createLead({
    ...input.contact,
    type: 'INSURANCE',
    vehicleType: input.vehicleType,
    modelId: input.modelId,
    variantId: input.variantId,
    metadata: {
      insurer: selected.insurer.name,
      plan: selected.planName,
      totalPremium: selected.totalPremium,
      idv: selected.idv,
      registrationNo: input.registrationNo ?? null,
      policyExpiry: input.previousPolicyExpiry?.toISOString() ?? null,
    },
  });

  const application = await prisma.insuranceApplication.create({
    data: {
      leadId: lead.id,
      insurerId: selected.insurer.id,
      planId: selected.planId,
      status: 'QUOTED',
      vehicleType: input.vehicleType,
      modelId: input.modelId,
      variantId: input.variantId,
      registrationNo: input.registrationNo,
      registrationYear: input.registrationYear,
      engineCc: vehicle.engineCc || null,
      policyType: input.policyType,
      isNewVehicle: input.isNewVehicle,
      previousPolicyExpiry: input.previousPolicyExpiry,
      ncbPercent: input.claimedLastYear ? 0 : input.ncbPercent,
      claimedLastYear: input.claimedLastYear,
      idv: BigInt(selected.idv),
      odPremium: BigInt(selected.odPremium),
      tpPremium: BigInt(selected.tpPremium),
      addOnPremium: BigInt(selected.addOnPremium),
      ncbDiscount: BigInt(selected.ncbDiscount),
      netPremium: BigInt(selected.netPremium),
      gstAmount: BigInt(selected.gstAmount),
      totalPremium: BigInt(selected.totalPremium),
      selectedAddOns: selected.addOns.map((addOn) => addOn.slug),
      breakup: selected.breakup as unknown as Prisma.InputJsonValue,
    },
  });

  await leads.recordActivity(
    lead.id,
    null,
    'INSURANCE_QUOTE_SELECTED',
    `${selected.insurer.name} — ₹${selected.totalPremium.toLocaleString('en-IN')}`,
  );

  return { applicationId: application.id, leadId: lead.id, quote: selected, vehicle };
}

export async function listInsurers(vehicleType?: VehicleType) {
  return prisma.insurer.findMany({
    where: {
      isActive: true,
      ...(vehicleType ? { plans: { some: { vehicleType, isActive: true } } } : {}),
    },
    orderBy: { claimSettlementRatio: 'desc' },
    include: {
      plans: {
        where: { isActive: true, ...(vehicleType ? { vehicleType } : {}) },
        select: { id: true, name: true, policyType: true, vehicleType: true, keyBenefits: true, isFeatured: true },
      },
    },
  });
}

export async function listAddOns(vehicleType: VehicleType) {
  return prisma.insuranceAddOn.findMany({ where: { vehicleType }, orderBy: { sortOrder: 'asc' } });
}

export async function listApplications(input: {
  status?: InsuranceApplicationStatus;
  page: number;
  limit: number;
}) {
  const where: Prisma.InsuranceApplicationWhereInput = input.status ? { status: input.status } : {};
  const [total, items] = await Promise.all([
    prisma.insuranceApplication.count({ where }),
    prisma.insuranceApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: {
        lead: { select: { id: true, fullName: true, phone: true, status: true } },
        insurer: { select: { name: true, logoUrl: true } },
        plan: { select: { name: true } },
      },
    }),
  ]);

  return {
    items,
    meta: { page: input.page, limit: input.limit, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) },
  };
}

export async function updateApplicationStatus(
  id: string,
  actorId: string,
  status: InsuranceApplicationStatus,
) {
  const application = await prisma.insuranceApplication.findUnique({ where: { id } });
  if (!application) throw new NotFoundError('Insurance application not found');

  const updated = await prisma.insuranceApplication.update({ where: { id }, data: { status } });
  await leads.recordActivity(
    application.leadId,
    actorId,
    'INSURANCE_STATUS_CHANGED',
    `${application.status} → ${status}`,
  );
  return updated;
}
