export type VehicleType = 'CAR' | 'BIKE' | 'BUS' | 'TRACTOR';
export type PolicyType = 'COMPREHENSIVE' | 'THIRD_PARTY' | 'OWN_DAMAGE';
export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS' | 'FARMER' | 'FLEET_OPERATOR';

export interface Brand {
  id: string;
  slug: string;
  name: string;
  vehicleType: VehicleType;
  logoUrl: string | null;
  isPopular: boolean;
  _count?: { models: number };
}

export interface ModelCard {
  id: string;
  slug: string;
  name: string;
  vehicleType: VehicleType;
  status: 'NEW' | 'UPCOMING' | 'DISCONTINUED';
  bodyType: string | null;
  priceMin: number;
  priceMax: number;
  mileageKmpl: number | null;
  engineCc: number | null;
  powerBhp: number | null;
  seatingCapacity: number | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  ptoHp: number | null;
  gvwKg: number | null;
  heroImageUrl: string | null;
  rating: number;
  reviewCount: number;
  launchDate: string | null;
  isPopular: boolean;
  brand: { id: string; slug: string; name: string; logoUrl: string | null };
}

export interface Variant {
  id: string;
  slug: string;
  name: string;
  exShowroomPrice: number;
  fuelType: string;
  transmission: string | null;
  engineCc: number | null;
  powerBhp: number | null;
  torqueNm: number | null;
  mileageKmpl: number | null;
  seatingCapacity: number | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  isTopSelling: boolean;
  specs: { group: string; items: { label: string; value: string }[] }[];
}

export interface ModelDetail extends ModelCard {
  description: string | null;
  segment: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: Variant[];
  images: { id: string; url: string; caption: string | null; category: string }[];
  highlights: { id: string; label: string; value: string; icon: string | null }[];
}

export interface City {
  id: string;
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  isPopular: boolean;
}

export interface BreakupLine {
  key: string;
  label: string;
  amount: number;
  note?: string;
}

export interface OnRoadQuote {
  quoteId: string;
  leadId: string;
  variant: { id: string; name: string; exShowroomPrice: number; fuelType: string };
  model: { id: string; name: string; slug: string; vehicleType: VehicleType; brand: { name: string; slug: string } };
  city: { id: string; slug: string; name: string; state: string };
  amounts: {
    exShowroom: number;
    roadTax: number;
    rtoCharges: number;
    insurance: number;
    fastag: number;
    handlingCharges: number;
    greenCess: number;
    tcs: number;
    otherCharges: number;
    totalOnRoad: number;
  };
  breakup: BreakupLine[];
}

export interface LoanOffer {
  id: string;
  vehicleType: VehicleType;
  interestRateMin: number;
  interestRateMax: number;
  maxTenureMonths: number;
  maxLtvPercent: number;
  processingFeePercent: number;
  minMonthlyIncome: number;
  minCreditScore: number;
  approvalHours: number;
  isFeatured: boolean;
  lender: { id: string; slug: string; name: string; logoUrl: string | null; type: string; about: string | null };
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

export interface EligibilityResult {
  summary: {
    requestedLoan: number;
    maxEmiBudget: number;
    foirPercent: number;
    eligibleOffers: number;
    bestRate: number | null;
  };
  offers: OfferEligibility[];
}

export interface InsuranceAddOn {
  id: string;
  slug: string;
  name: string;
  description: string;
  ratePercent: number;
}

export interface PlanQuote {
  planId: string;
  planName: string;
  insurer: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    claimSettlementRatio: number;
    cashlessGarages: number;
  };
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
  breakup: BreakupLine[];
}

export interface QuoteResponse {
  vehicle: { label: string; idv: number; ageYears: number; depreciationPercent: number; engineCc: number };
  quotes: PlanQuote[];
}
