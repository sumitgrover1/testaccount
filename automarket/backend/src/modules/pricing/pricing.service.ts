import type { FuelType, Prisma, VehicleType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import * as leadService from '../leads/lead.service';

export interface BreakupLine {
  key: string;
  label: string;
  amount: number;
  note?: string;
}

// Ex-showroom above which 1% TCS applies (Income Tax Act s.206C(1F)).
const TCS_THRESHOLD = 1_000_000n;

function percentOf(amount: bigint, percent: number): bigint {
  // Percentages are configured with up to two decimals (e.g. 10.75%). Scale by
  // 10,000 so the arithmetic stays in integer rupees without float drift.
  return (amount * BigInt(Math.round(percent * 10_000))) / 1_000_000n;
}

async function resolveRule(cityId: string, vehicleType: VehicleType, fuelType: FuelType, exShowroom: bigint) {
  const rules = await prisma.rtoRule.findMany({
    where: {
      cityId,
      vehicleType,
      priceBandMin: { lte: exShowroom },
      priceBandMax: { gt: exShowroom },
      OR: [{ fuelType }, { fuelType: null }],
    },
  });
  if (rules.length === 0) {
    throw new NotFoundError('On-road pricing is not configured for this city yet');
  }
  // A fuel-specific rule wins over the band's generic fallback.
  return rules.find((rule) => rule.fuelType === fuelType) ?? rules[0];
}

async function thirdPartyPremium(vehicleType: VehicleType, engineCc: number | null): Promise<bigint> {
  const cc = engineCc ?? 0;
  const rate = await prisma.thirdPartyRate.findFirst({
    where: { vehicleType, ccMin: { lte: cc }, ccMax: { gte: cc } },
  });
  // Falling back to the highest configured slab is deliberate: under-quoting a
  // statutory premium would understate the on-road price the customer pays.
  const fallback = await prisma.thirdPartyRate.findFirst({
    where: { vehicleType },
    orderBy: { annualPremium: 'desc' },
  });
  return rate?.annualPremium ?? fallback?.annualPremium ?? 0n;
}

export async function computeOnRoadPrice(variantId: string, citySlug: string) {
  const [variant, city] = await Promise.all([
    prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        model: {
          select: {
            id: true,
            name: true,
            slug: true,
            vehicleType: true,
            heroImageUrl: true,
            brand: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.city.findUnique({ where: { slug: citySlug } }),
  ]);

  if (!variant) throw new NotFoundError('Variant not found');
  if (!city) throw new NotFoundError('City not found');

  const exShowroom = variant.exShowroomPrice;
  const vehicleType = variant.model.vehicleType;
  const rule = await resolveRule(city.id, vehicleType, variant.fuelType, exShowroom);

  const roadTax = percentOf(exShowroom, rule.roadTaxPercent);
  const registration = rule.registrationFee;
  const hypothecation = rule.hypothecationFee;
  const fastag = rule.fastagFee;
  const greenCess = rule.greenCess;

  const odPremium = percentOf(exShowroom, rule.insuranceOdPercent);
  const tpPremium = await thirdPartyPremium(vehicleType, variant.engineCc);
  const insuranceBeforeGst = odPremium + tpPremium;
  const insurance = insuranceBeforeGst + percentOf(insuranceBeforeGst, env.INSURANCE_GST_PERCENT);

  const rawHandling = percentOf(exShowroom, rule.handlingChargePercent);
  const handling =
    rule.handlingChargeCap > 0n && rawHandling > rule.handlingChargeCap
      ? rule.handlingChargeCap
      : rawHandling;

  // TCS applies only to motor vehicles above the threshold, collected by the
  // dealer at invoicing — it is part of what the buyer pays on the day.
  const tcs =
    vehicleType === 'CAR' && exShowroom > TCS_THRESHOLD
      ? percentOf(exShowroom, rule.tcsPercent)
      : 0n;

  const rtoCharges = roadTax + registration + hypothecation + greenCess;
  const otherCharges = fastag + handling;
  const total = exShowroom + rtoCharges + insurance + otherCharges + tcs;

  const breakup: BreakupLine[] = [
    { key: 'exShowroom', label: 'Ex-showroom price', amount: Number(exShowroom) },
    {
      key: 'roadTax',
      label: 'Road tax',
      amount: Number(roadTax),
      note: `${rule.roadTaxPercent}% of ex-showroom in ${city.state}`,
    },
    { key: 'registration', label: 'Registration charges', amount: Number(registration) },
    ...(hypothecation > 0n
      ? [
          {
            key: 'hypothecation',
            label: 'Hypothecation charges',
            amount: Number(hypothecation),
            note: 'Applicable when the vehicle is financed',
          },
        ]
      : []),
    ...(greenCess > 0n
      ? [{ key: 'greenCess', label: 'Green cess', amount: Number(greenCess) }]
      : []),
    {
      key: 'insurance',
      label: 'Insurance (1 year)',
      amount: Number(insurance),
      note: `Own damage + third party, incl. ${env.INSURANCE_GST_PERCENT}% GST`,
    },
    ...(fastag > 0n ? [{ key: 'fastag', label: 'FASTag', amount: Number(fastag) }] : []),
    ...(handling > 0n
      ? [
          {
            key: 'handling',
            label: 'Handling / logistics charges',
            amount: Number(handling),
            note: 'Dealer charge — negotiable',
          },
        ]
      : []),
    ...(tcs > 0n
      ? [
          {
            key: 'tcs',
            label: 'TCS',
            amount: Number(tcs),
            note: 'Refundable against your income tax return',
          },
        ]
      : []),
  ];

  return {
    variant: {
      id: variant.id,
      name: variant.name,
      slug: variant.slug,
      fuelType: variant.fuelType,
      transmission: variant.transmission,
      exShowroomPrice: exShowroom,
    },
    model: variant.model,
    city: { id: city.id, slug: city.slug, name: city.name, state: city.state },
    amounts: {
      exShowroom,
      roadTax,
      rtoCharges,
      insurance,
      fastag,
      handlingCharges: handling,
      greenCess,
      tcs,
      otherCharges,
      totalOnRoad: total,
    },
    breakup,
  };
}

// Shown before the customer identifies themselves: enough to prove the page is
// real (ex-showroom is public information), not enough to skip the form.
export async function getTeaser(variantId: string, citySlug: string) {
  const quote = await computeOnRoadPrice(variantId, citySlug);
  return {
    variant: quote.variant,
    model: quote.model,
    city: quote.city,
    exShowroom: quote.amounts.exShowroom,
    // A ±2% band around the real total, so the shopper knows the ballpark and
    // still has a reason to unlock the exact, itemised number.
    estimatedRange: {
      from: (quote.amounts.totalOnRoad * 98n) / 100n,
      to: (quote.amounts.totalOnRoad * 102n) / 100n,
    },
    unlockRequired: true,
  };
}

export interface QuoteWithLeadInput {
  variantId: string;
  citySlug: string;
  contact: {
    fullName: string;
    phone: string;
    email?: string;
    citySlug?: string;
    consentToContact: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

// The trade at the heart of the marketplace: the customer gets the exact
// itemised on-road price, the business gets a qualified lead with the exact
// variant and city they are shopping for.
export async function createQuoteWithLead(input: QuoteWithLeadInput) {
  const quote = await computeOnRoadPrice(input.variantId, input.citySlug);

  const lead = await leadService.createLead({
    ...input.contact,
    citySlug: input.contact.citySlug ?? input.citySlug,
    type: 'ON_ROAD_PRICE',
    vehicleType: quote.model.vehicleType,
    modelId: quote.model.id,
    variantId: quote.variant.id,
    metadata: {
      totalOnRoad: Number(quote.amounts.totalOnRoad),
      city: quote.city.name,
    },
  });

  const saved = await prisma.onRoadQuote.create({
    data: {
      variantId: input.variantId,
      cityId: quote.city.id,
      leadId: lead.id,
      exShowroom: quote.amounts.exShowroom,
      rtoCharges: quote.amounts.rtoCharges,
      roadTax: quote.amounts.roadTax,
      insurance: quote.amounts.insurance,
      fastag: quote.amounts.fastag,
      handlingCharges: quote.amounts.handlingCharges,
      greenCess: quote.amounts.greenCess,
      tcs: quote.amounts.tcs,
      otherCharges: quote.amounts.otherCharges,
      totalOnRoad: quote.amounts.totalOnRoad,
      breakup: quote.breakup as unknown as Prisma.InputJsonValue,
    },
  });

  await leadService.recordActivity(
    lead.id,
    null,
    'ON_ROAD_PRICE_UNLOCKED',
    `${quote.model.brand.name} ${quote.model.name} ${quote.variant.name} in ${quote.city.name}`,
  );

  return { quoteId: saved.id, leadId: lead.id, ...quote };
}

export async function getQuote(id: string) {
  const quote = await prisma.onRoadQuote.findUnique({
    where: { id },
    include: {
      city: { select: { name: true, state: true, slug: true } },
      variant: {
        include: {
          model: { select: { name: true, slug: true, heroImageUrl: true, brand: { select: { name: true, slug: true } } } },
        },
      },
    },
  });
  if (!quote) throw new NotFoundError('Quote not found');
  return quote;
}
