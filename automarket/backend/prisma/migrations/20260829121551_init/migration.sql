-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'BIKE', 'BUS', 'TRACTOR');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'LPG');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTOMATIC', 'AMT', 'CVT', 'DCT', 'IMT');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('NEW', 'UPCOMING', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPS_MANAGER', 'SALES_AGENT', 'CONTENT_EDITOR');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('ON_ROAD_PRICE', 'TEST_DRIVE', 'DEALER_CONTACT', 'CALLBACK', 'FINANCE', 'INSURANCE', 'NEWSLETTER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DEALER_ASSIGNED', 'CONVERTED', 'LOST', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "LenderType" AS ENUM ('BANK', 'NBFC', 'CAPTIVE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'FARMER', 'FLEET_OPERATOR');

-- CreateEnum
CREATE TYPE "LoanApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'DOCS_PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('COMPREHENSIVE', 'THIRD_PARTY', 'OWN_DAMAGE');

-- CreateEnum
CREATE TYPE "InsuranceApplicationStatus" AS ENUM ('QUOTED', 'DETAILS_PENDING', 'PAYMENT_PENDING', 'ISSUED', 'LOST');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SALES_AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "logoUrl" TEXT,
    "country" TEXT,
    "about" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'NEW',
    "bodyType" TEXT,
    "segment" TEXT,
    "description" TEXT,
    "priceMin" BIGINT NOT NULL,
    "priceMax" BIGINT NOT NULL,
    "mileageKmpl" DOUBLE PRECISION,
    "engineCc" INTEGER,
    "powerBhp" DOUBLE PRECISION,
    "seatingCapacity" INTEGER,
    "batteryKwh" DOUBLE PRECISION,
    "rangeKm" INTEGER,
    "ptoHp" DOUBLE PRECISION,
    "gvwKg" INTEGER,
    "heroImageUrl" TEXT,
    "brochureUrl" TEXT,
    "launchDate" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "exShowroomPrice" BIGINT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "transmission" "Transmission",
    "engineCc" INTEGER,
    "powerBhp" DOUBLE PRECISION,
    "torqueNm" DOUBLE PRECISION,
    "mileageKmpl" DOUBLE PRECISION,
    "seatingCapacity" INTEGER,
    "batteryKwh" DOUBLE PRECISION,
    "rangeKm" INTEGER,
    "isTopSelling" BOOLEAN NOT NULL DEFAULT false,
    "isDiscontinued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantSpec" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VariantSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelImage" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT NOT NULL DEFAULT 'EXTERIOR',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModelImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelHighlight" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModelHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RtoRule" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "fuelType" "FuelType",
    "priceBandMin" BIGINT NOT NULL DEFAULT 0,
    "priceBandMax" BIGINT NOT NULL,
    "roadTaxPercent" DOUBLE PRECISION NOT NULL,
    "registrationFee" BIGINT NOT NULL DEFAULT 0,
    "hypothecationFee" BIGINT NOT NULL DEFAULT 0,
    "fastagFee" BIGINT NOT NULL DEFAULT 0,
    "greenCess" BIGINT NOT NULL DEFAULT 0,
    "handlingChargePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "handlingChargeCap" BIGINT NOT NULL DEFAULT 0,
    "insuranceOdPercent" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "tcsPercent" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "RtoRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPartyRate" (
    "id" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "ccMin" INTEGER NOT NULL DEFAULT 0,
    "ccMax" INTEGER NOT NULL,
    "annualPremium" BIGINT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ThirdPartyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandSlug" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "cityId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnRoadQuote" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "exShowroom" BIGINT NOT NULL,
    "rtoCharges" BIGINT NOT NULL,
    "roadTax" BIGINT NOT NULL,
    "insurance" BIGINT NOT NULL,
    "fastag" BIGINT NOT NULL,
    "handlingCharges" BIGINT NOT NULL,
    "greenCess" BIGINT NOT NULL,
    "tcs" BIGINT NOT NULL,
    "otherCharges" BIGINT NOT NULL,
    "totalOnRoad" BIGINT NOT NULL,
    "breakup" JSONB NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnRoadQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cityId" TEXT,
    "vehicleType" "VehicleType",
    "modelId" TEXT,
    "variantId" TEXT,
    "dealerId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "metadata" JSONB,
    "consentToContact" BOOLEAN NOT NULL DEFAULT true,
    "assignedToId" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lender" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LenderType" NOT NULL,
    "logoUrl" TEXT,
    "about" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanOffer" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "interestRateMin" DOUBLE PRECISION NOT NULL,
    "interestRateMax" DOUBLE PRECISION NOT NULL,
    "maxTenureMonths" INTEGER NOT NULL,
    "minTenureMonths" INTEGER NOT NULL DEFAULT 12,
    "maxLtvPercent" DOUBLE PRECISION NOT NULL,
    "processingFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "processingFeeMin" BIGINT NOT NULL DEFAULT 0,
    "processingFeeMax" BIGINT NOT NULL DEFAULT 0,
    "minLoanAmount" BIGINT NOT NULL,
    "maxLoanAmount" BIGINT NOT NULL,
    "minMonthlyIncome" BIGINT NOT NULL,
    "minCreditScore" INTEGER NOT NULL DEFAULT 700,
    "minAge" INTEGER NOT NULL DEFAULT 21,
    "maxAge" INTEGER NOT NULL DEFAULT 65,
    "employmentTypes" "EmploymentType"[],
    "approvalHours" INTEGER NOT NULL DEFAULT 48,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LoanOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "offerId" TEXT,
    "lenderId" TEXT,
    "status" "LoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "vehicleType" "VehicleType" NOT NULL,
    "modelId" TEXT,
    "variantId" TEXT,
    "vehiclePrice" BIGINT NOT NULL,
    "downPayment" BIGINT NOT NULL,
    "loanAmount" BIGINT NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "emiAmount" BIGINT NOT NULL,
    "totalInterest" BIGINT NOT NULL,
    "totalPayable" BIGINT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "monthlyIncome" BIGINT NOT NULL,
    "existingEmi" BIGINT NOT NULL DEFAULT 0,
    "creditScore" INTEGER,
    "age" INTEGER,
    "panLast4" TEXT,
    "eligibilityScore" INTEGER,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "claimSettlementRatio" DOUBLE PRECISION NOT NULL,
    "cashlessGarages" INTEGER NOT NULL DEFAULT 0,
    "about" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePlan" (
    "id" TEXT NOT NULL,
    "insurerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "policyType" "PolicyType" NOT NULL,
    "odRatePercent" DOUBLE PRECISION NOT NULL,
    "zeroDepIncluded" BOOLEAN NOT NULL DEFAULT false,
    "roadsideAssistance" BOOLEAN NOT NULL DEFAULT false,
    "engineProtect" BOOLEAN NOT NULL DEFAULT false,
    "personalAccidentCover" BIGINT NOT NULL DEFAULT 1500000,
    "keyBenefits" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InsurancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceAddOn" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InsuranceAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceApplication" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "insurerId" TEXT,
    "planId" TEXT,
    "status" "InsuranceApplicationStatus" NOT NULL DEFAULT 'QUOTED',
    "vehicleType" "VehicleType" NOT NULL,
    "modelId" TEXT,
    "variantId" TEXT,
    "registrationNo" TEXT,
    "registrationYear" INTEGER NOT NULL,
    "engineCc" INTEGER,
    "policyType" "PolicyType" NOT NULL,
    "isNewVehicle" BOOLEAN NOT NULL DEFAULT false,
    "previousPolicyExpiry" TIMESTAMP(3),
    "ncbPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claimedLastYear" BOOLEAN NOT NULL DEFAULT false,
    "idv" BIGINT NOT NULL,
    "odPremium" BIGINT NOT NULL,
    "tpPremium" BIGINT NOT NULL,
    "addOnPremium" BIGINT NOT NULL,
    "ncbDiscount" BIGINT NOT NULL,
    "netPremium" BIGINT NOT NULL,
    "gstAmount" BIGINT NOT NULL,
    "totalPremium" BIGINT NOT NULL,
    "selectedAddOns" TEXT[],
    "breakup" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_role_isActive_idx" ON "AdminUser"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_vehicleType_isPopular_idx" ON "Brand"("vehicleType", "isPopular");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_vehicleType_name_key" ON "Brand"("vehicleType", "name");

-- CreateIndex
CREATE INDEX "VehicleModel_vehicleType_status_idx" ON "VehicleModel"("vehicleType", "status");

-- CreateIndex
CREATE INDEX "VehicleModel_vehicleType_isPopular_idx" ON "VehicleModel"("vehicleType", "isPopular");

-- CreateIndex
CREATE INDEX "VehicleModel_priceMin_priceMax_idx" ON "VehicleModel"("priceMin", "priceMax");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_brandId_slug_key" ON "VehicleModel"("brandId", "slug");

-- CreateIndex
CREATE INDEX "Variant_modelId_exShowroomPrice_idx" ON "Variant"("modelId", "exShowroomPrice");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_modelId_slug_key" ON "Variant"("modelId", "slug");

-- CreateIndex
CREATE INDEX "VariantSpec_variantId_sortOrder_idx" ON "VariantSpec"("variantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "VariantSpec_variantId_group_label_key" ON "VariantSpec"("variantId", "group", "label");

-- CreateIndex
CREATE INDEX "ModelImage_modelId_sortOrder_idx" ON "ModelImage"("modelId", "sortOrder");

-- CreateIndex
CREATE INDEX "ModelHighlight_modelId_sortOrder_idx" ON "ModelHighlight"("modelId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_state_idx" ON "City"("state");

-- CreateIndex
CREATE INDEX "City_isPopular_idx" ON "City"("isPopular");

-- CreateIndex
CREATE INDEX "RtoRule_cityId_vehicleType_priceBandMin_idx" ON "RtoRule"("cityId", "vehicleType", "priceBandMin");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartyRate_vehicleType_ccMin_ccMax_key" ON "ThirdPartyRate"("vehicleType", "ccMin", "ccMax");

-- CreateIndex
CREATE INDEX "Dealer_cityId_brandSlug_idx" ON "Dealer"("cityId", "brandSlug");

-- CreateIndex
CREATE INDEX "OnRoadQuote_variantId_cityId_idx" ON "OnRoadQuote"("variantId", "cityId");

-- CreateIndex
CREATE INDEX "Lead_type_status_createdAt_idx" ON "Lead"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_status_idx" ON "Lead"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lender_slug_key" ON "Lender"("slug");

-- CreateIndex
CREATE INDEX "LoanOffer_vehicleType_interestRateMin_idx" ON "LoanOffer"("vehicleType", "interestRateMin");

-- CreateIndex
CREATE UNIQUE INDEX "LoanOffer_lenderId_vehicleType_key" ON "LoanOffer"("lenderId", "vehicleType");

-- CreateIndex
CREATE INDEX "LoanApplication_status_createdAt_idx" ON "LoanApplication"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Insurer_slug_key" ON "Insurer"("slug");

-- CreateIndex
CREATE INDEX "InsurancePlan_vehicleType_policyType_idx" ON "InsurancePlan"("vehicleType", "policyType");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePlan_insurerId_slug_key" ON "InsurancePlan"("insurerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceAddOn_vehicleType_slug_key" ON "InsuranceAddOn"("vehicleType", "slug");

-- CreateIndex
CREATE INDEX "InsuranceApplication_status_createdAt_idx" ON "InsuranceApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantSpec" ADD CONSTRAINT "VariantSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelImage" ADD CONSTRAINT "ModelImage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelHighlight" ADD CONSTRAINT "ModelHighlight_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RtoRule" ADD CONSTRAINT "RtoRule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnRoadQuote" ADD CONSTRAINT "OnRoadQuote_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnRoadQuote" ADD CONSTRAINT "OnRoadQuote_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnRoadQuote" ADD CONSTRAINT "OnRoadQuote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "LoanOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePlan" ADD CONSTRAINT "InsurancePlan_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InsurancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
