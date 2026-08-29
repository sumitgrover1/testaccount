import type { EmploymentType, LoanApplicationStatus, Prisma, VehicleType } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import * as leadService from '../leads/lead.service';

// Share of monthly income a lender will let go to loan EMIs (fixed obligation
// to income ratio). Indian auto lenders cluster around 50-55%; the conservative
// end keeps quoted eligibility close to what actually gets sanctioned.
const FOIR = 0.5;

export interface EmiResult {
  emi: number;
  principal: number;
  totalInterest: number;
  totalPayable: number;
  interestRate: number;
  tenureMonths: number;
  schedule?: AmortisationRow[];
}

export interface AmortisationRow {
  month: number;
  emi: number;
  principalComponent: number;
  interestComponent: number;
  balance: number;
}

// Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1).
export function calculateEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  includeSchedule = false,
): EmiResult {
  const monthlyRate = annualRate / 12 / 100;
  const growth = Math.pow(1 + monthlyRate, tenureMonths);
  const emi =
    monthlyRate === 0
      ? principal / tenureMonths
      : (principal * monthlyRate * growth) / (growth - 1);

  const roundedEmi = Math.round(emi);
  const totalPayable = roundedEmi * tenureMonths;

  const result: EmiResult = {
    emi: roundedEmi,
    principal,
    totalInterest: totalPayable - principal,
    totalPayable,
    interestRate: annualRate,
    tenureMonths,
  };

  if (includeSchedule) {
    const schedule: AmortisationRow[] = [];
    let balance = principal;
    for (let month = 1; month <= tenureMonths; month += 1) {
      const interestComponent = Math.round(balance * monthlyRate);
      // The final instalment absorbs the rounding drift so the balance closes
      // at exactly zero rather than a few rupees either side.
      const principalComponent =
        month === tenureMonths ? balance : Math.round(roundedEmi - interestComponent);
      balance = Math.max(0, balance - principalComponent);
      schedule.push({
        month,
        emi: month === tenureMonths ? principalComponent + interestComponent : roundedEmi,
        principalComponent,
        interestComponent,
        balance,
      });
    }
    result.schedule = schedule;
  }

  return result;
}

// Reverse of the EMI formula: the largest principal whose EMI fits the budget.
export function maxLoanForEmi(maxEmi: number, annualRate: number, tenureMonths: number): number {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.floor(maxEmi * tenureMonths);
  const growth = Math.pow(1 + monthlyRate, tenureMonths);
  return Math.floor((maxEmi * (growth - 1)) / (monthlyRate * growth));
}

export async function listOffers(input: { vehicleType?: VehicleType; featured?: boolean }) {
  return prisma.loanOffer.findMany({
    where: {
      ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
      ...(input.featured !== undefined ? { isFeatured: input.featured } : {}),
      lender: { isActive: true },
    },
    orderBy: [{ isFeatured: 'desc' }, { interestRateMin: 'asc' }],
    include: {
      lender: { select: { id: true, slug: true, name: true, logoUrl: true, type: true, about: true } },
    },
  });
}

export interface EligibilityInput {
  vehicleType: VehicleType;
  vehiclePrice: number;
  downPayment: number;
  tenureMonths: number;
  monthlyIncome: number;
  existingEmi: number;
  employmentType: EmploymentType;
  age: number;
  creditScore?: number;
}

export interface OfferEligibility {
  offerId: string;
  lender: { id: string; slug: string; name: string; logoUrl: string | null; type: string };
  eligible: boolean;
  reasons: string[];
  interestRate: number;
  tenureMonths: number;
  approvedLoanAmount: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  processingFee: number;
  maxLtvPercent: number;
  approvalHours: number;
}

// Rate offered inside the lender's advertised band, better for stronger credit.
function rateForScore(min: number, max: number, creditScore?: number): number {
  if (creditScore === undefined) return Number(((min + max) / 2).toFixed(2));
  if (creditScore >= 800) return min;
  if (creditScore >= 750) return Number((min + (max - min) * 0.25).toFixed(2));
  if (creditScore >= 700) return Number((min + (max - min) * 0.5).toFixed(2));
  return max;
}

export async function checkEligibility(input: EligibilityInput) {
  if (input.downPayment >= input.vehiclePrice) {
    throw new BadRequestError('Down payment cannot be equal to or more than the vehicle price');
  }

  const requestedLoan = input.vehiclePrice - input.downPayment;
  const budgetEmi = Math.max(0, Math.round(input.monthlyIncome * FOIR - input.existingEmi));

  const offers = await listOffers({ vehicleType: input.vehicleType });

  const results: OfferEligibility[] = offers.map((offer) => {
    const reasons: string[] = [];

    if (input.age < offer.minAge || input.age > offer.maxAge) {
      reasons.push(`Age must be between ${offer.minAge} and ${offer.maxAge} years`);
    }
    if (input.monthlyIncome < Number(offer.minMonthlyIncome)) {
      reasons.push(`Minimum monthly income of ₹${Number(offer.minMonthlyIncome).toLocaleString('en-IN')} required`);
    }
    if (input.creditScore !== undefined && input.creditScore < offer.minCreditScore) {
      reasons.push(`Minimum credit score of ${offer.minCreditScore} required`);
    }
    if (!offer.employmentTypes.includes(input.employmentType)) {
      reasons.push('This lender does not fund your employment profile');
    }
    if (budgetEmi <= 0) {
      reasons.push('Your existing EMIs already use up the eligible share of your income');
    }

    const rate = rateForScore(offer.interestRateMin, offer.interestRateMax, input.creditScore);
    const tenure = Math.min(input.tenureMonths, offer.maxTenureMonths);

    // The sanction is the smallest of: what the buyer asked for, what their
    // income supports, the lender's LTV cap, and the product's ceiling.
    const ltvCap = Math.floor((input.vehiclePrice * offer.maxLtvPercent) / 100);
    const incomeCap = budgetEmi > 0 ? maxLoanForEmi(budgetEmi, rate, tenure) : 0;
    const approved = Math.min(requestedLoan, incomeCap, ltvCap, Number(offer.maxLoanAmount));

    if (approved < Number(offer.minLoanAmount)) {
      reasons.push(`Loan amount is below this lender's minimum of ₹${Number(offer.minLoanAmount).toLocaleString('en-IN')}`);
    }

    const eligible = reasons.length === 0 && approved > 0;
    const emiResult = calculateEmi(Math.max(approved, 0) || 1, rate, tenure);

    const rawFee = Math.round((approved * offer.processingFeePercent) / 100);
    const feeMin = Number(offer.processingFeeMin);
    const feeMax = Number(offer.processingFeeMax);
    const processingFee = Math.min(Math.max(rawFee, feeMin), feeMax > 0 ? feeMax : rawFee);

    return {
      offerId: offer.id,
      lender: {
        id: offer.lender.id,
        slug: offer.lender.slug,
        name: offer.lender.name,
        logoUrl: offer.lender.logoUrl,
        type: offer.lender.type,
      },
      eligible,
      reasons,
      interestRate: rate,
      tenureMonths: tenure,
      approvedLoanAmount: Math.max(approved, 0),
      emi: approved > 0 ? emiResult.emi : 0,
      totalInterest: approved > 0 ? emiResult.totalInterest : 0,
      totalPayable: approved > 0 ? emiResult.totalPayable : 0,
      processingFee,
      maxLtvPercent: offer.maxLtvPercent,
      approvalHours: offer.approvalHours,
    };
  });

  // Eligible offers first, cheapest EMI at the top — the order a borrower cares
  // about.
  results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return a.emi - b.emi;
  });

  return {
    summary: {
      requestedLoan,
      maxEmiBudget: budgetEmi,
      foirPercent: FOIR * 100,
      eligibleOffers: results.filter((r) => r.eligible).length,
      bestRate: results.find((r) => r.eligible)?.interestRate ?? null,
    },
    offers: results,
  };
}

export interface ApplyInput extends EligibilityInput {
  contact: leadService.LeadContact;
  offerId?: string;
  modelId?: string;
  variantId?: string;
  panLast4?: string;
}

export async function applyForLoan(input: ApplyInput) {
  const eligibility = await checkEligibility(input);
  const selected = input.offerId
    ? eligibility.offers.find((o) => o.offerId === input.offerId)
    : eligibility.offers.find((o) => o.eligible);

  if (input.offerId && !selected) throw new NotFoundError('Loan offer not found');

  const rate = selected?.interestRate ?? env.DEFAULT_LOAN_INTEREST_RATE;
  const tenure = selected?.tenureMonths ?? input.tenureMonths;
  const loanAmount = selected?.approvedLoanAmount || input.vehiclePrice - input.downPayment;
  const emi = calculateEmi(loanAmount, rate, tenure);

  const lead = await leadService.createLead({
    ...input.contact,
    type: 'FINANCE',
    vehicleType: input.vehicleType,
    modelId: input.modelId,
    variantId: input.variantId,
    metadata: {
      loanAmount,
      tenureMonths: tenure,
      emi: emi.emi,
      lender: selected?.lender.name ?? null,
      employmentType: input.employmentType,
    },
  });

  const offer = selected
    ? await prisma.loanOffer.findUnique({ where: { id: selected.offerId }, select: { lenderId: true } })
    : null;

  const application = await prisma.loanApplication.create({
    data: {
      leadId: lead.id,
      offerId: selected?.offerId,
      lenderId: offer?.lenderId,
      status: 'SUBMITTED',
      vehicleType: input.vehicleType,
      modelId: input.modelId,
      variantId: input.variantId,
      vehiclePrice: BigInt(input.vehiclePrice),
      downPayment: BigInt(input.downPayment),
      loanAmount: BigInt(loanAmount),
      tenureMonths: tenure,
      interestRate: rate,
      emiAmount: BigInt(emi.emi),
      totalInterest: BigInt(emi.totalInterest),
      totalPayable: BigInt(emi.totalPayable),
      employmentType: input.employmentType,
      monthlyIncome: BigInt(input.monthlyIncome),
      existingEmi: BigInt(input.existingEmi),
      creditScore: input.creditScore,
      age: input.age,
      panLast4: input.panLast4,
      eligibilityScore: eligibility.summary.eligibleOffers > 0 ? 100 : 40,
    },
  });

  await leadService.recordActivity(
    lead.id,
    null,
    'LOAN_APPLICATION_SUBMITTED',
    `₹${loanAmount.toLocaleString('en-IN')} over ${tenure} months`,
  );

  return {
    applicationId: application.id,
    leadId: lead.id,
    selectedOffer: selected ?? null,
    emi,
    alternatives: eligibility.offers.filter((o) => o.offerId !== selected?.offerId).slice(0, 3),
  };
}

export async function listApplications(input: {
  status?: LoanApplicationStatus;
  page: number;
  limit: number;
}) {
  const where: Prisma.LoanApplicationWhereInput = input.status ? { status: input.status } : {};
  const [total, items] = await Promise.all([
    prisma.loanApplication.count({ where }),
    prisma.loanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: {
        lead: { select: { id: true, fullName: true, phone: true, status: true } },
        lender: { select: { name: true, logoUrl: true } },
        model: { select: { name: true, brand: { select: { name: true } } } },
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
  status: LoanApplicationStatus,
  rejectionReason?: string,
) {
  const application = await prisma.loanApplication.findUnique({ where: { id } });
  if (!application) throw new NotFoundError('Loan application not found');

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: { status, rejectionReason: status === 'REJECTED' ? rejectionReason : null },
  });

  await leadService.recordActivity(
    application.leadId,
    actorId,
    'LOAN_STATUS_CHANGED',
    `${application.status} → ${status}`,
  );

  return updated;
}
