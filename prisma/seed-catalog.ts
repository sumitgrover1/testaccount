// Seeds a starter treatment + package catalog with market-typical pricing for
// a skin/hair/aesthetic clinic, so Packages/Invoices/Enrollments have real
// data to pick from instead of empty dropdowns.
//
// Requires a Super Admin account to already exist (run `npm run prisma:seed`
// first) — treatments/packages are created via the same service functions
// the API uses, so audit log + price history entries are attributed to that
// admin, exactly as if they'd been created by hand from the admin panel.
//
// Usage: npm run prisma:seed:catalog
// Safe to re-run — skips any treatment/package whose name already exists.
import { PrismaClient, Role } from '@prisma/client';
import * as treatmentService from '../src/modules/treatments/treatment.service';
import * as packageService from '../src/modules/packages/package.service';

const prisma = new PrismaClient();

interface TreatmentSeed {
  name: string;
  category: string;
  description: string;
  defaultPrice: number;
  durationMinutes: number;
  numberOfSessions: number;
}

const treatments: TreatmentSeed[] = [
  // --- Skin ---
  { name: 'HydraFacial', category: 'Skin', description: 'A deep-cleansing, hydrating facial that exfoliates and infuses the skin with moisture and antioxidants.', defaultPrice: 3500, durationMinutes: 60, numberOfSessions: 1 },
  { name: 'Glow Peel (Chemical Peel)', category: 'Skin', description: 'A chemical exfoliation treatment to even out tone and texture and reduce dullness.', defaultPrice: 2500, durationMinutes: 45, numberOfSessions: 4 },
  { name: 'Acne Clear Facial', category: 'Skin', description: 'A targeted facial protocol to help manage active acne and reduce breakouts.', defaultPrice: 3000, durationMinutes: 60, numberOfSessions: 6 },
  { name: 'Pigmentation Correction Therapy', category: 'Skin', description: 'A course of sessions aimed at reducing dark spots and uneven pigmentation.', defaultPrice: 2800, durationMinutes: 45, numberOfSessions: 6 },
  { name: 'Carbon Laser Facial', category: 'Skin', description: 'A laser-assisted facial for pore refinement and skin brightening.', defaultPrice: 4500, durationMinutes: 45, numberOfSessions: 1 },
  { name: 'Skin Microneedling', category: 'Skin', description: 'Collagen-induction therapy to improve skin texture and reduce scarring.', defaultPrice: 4000, durationMinutes: 60, numberOfSessions: 4 },
  { name: 'PRP Facial (Vampire Facial)', category: 'Skin', description: 'Platelet-rich plasma facial for skin rejuvenation.', defaultPrice: 6000, durationMinutes: 75, numberOfSessions: 3 },
  { name: "Botox - Forehead Lines", category: 'Skin', description: 'Anti-wrinkle injection to visibly soften horizontal forehead lines.', defaultPrice: 8000, durationMinutes: 30, numberOfSessions: 1 },
  { name: "Botox - Crow's Feet", category: 'Skin', description: 'Anti-wrinkle injection to soften fine lines around the eyes.', defaultPrice: 7000, durationMinutes: 20, numberOfSessions: 1 },
  { name: 'Botox - Frown Lines (Glabella)', category: 'Skin', description: 'Anti-wrinkle injection to soften frown lines between the brows.', defaultPrice: 7500, durationMinutes: 20, numberOfSessions: 1 },
  { name: 'Skin Brightening (Dermaroller)', category: 'Skin', description: 'A dermaroller-based treatment to even out skin tone and boost radiance.', defaultPrice: 3500, durationMinutes: 45, numberOfSessions: 4 },
  { name: 'Under-Eye Dark Circle Treatment', category: 'Skin', description: 'A focused therapy to reduce the appearance of dark circles and under-eye puffiness.', defaultPrice: 2500, durationMinutes: 30, numberOfSessions: 4 },
  { name: 'Oxygen Facial', category: 'Skin', description: 'An oxygen-infusion facial to instantly refresh and hydrate the skin.', defaultPrice: 2800, durationMinutes: 45, numberOfSessions: 1 },
  { name: 'Stretch Mark Reduction Therapy', category: 'Skin', description: 'A course of sessions to help reduce the appearance of stretch marks.', defaultPrice: 3200, durationMinutes: 45, numberOfSessions: 6 },
  { name: 'Vitamin C Brightening Facial', category: 'Skin', description: 'An antioxidant-rich facial to brighten dull skin and even out tone.', defaultPrice: 2600, durationMinutes: 45, numberOfSessions: 4 },

  // --- Hair ---
  { name: 'PRP Hair Regrowth Therapy', category: 'Hair', description: 'Platelet-rich plasma therapy to stimulate hair follicles and support regrowth.', defaultPrice: 5000, durationMinutes: 60, numberOfSessions: 4 },
  { name: 'GFC Hair Treatment', category: 'Hair', description: 'Growth Factor Concentrate therapy for hair thinning and hair fall.', defaultPrice: 6000, durationMinutes: 60, numberOfSessions: 4 },
  { name: 'Hair Mesotherapy', category: 'Hair', description: 'A course of scalp treatments with nutrients to support healthier hair growth.', defaultPrice: 3500, durationMinutes: 45, numberOfSessions: 6 },
  { name: 'Anti-Dandruff Scalp Therapy', category: 'Hair', description: 'A scalp treatment to help manage dandruff and scalp irritation.', defaultPrice: 2000, durationMinutes: 45, numberOfSessions: 4 },
  { name: 'Hair Spa & Nourishment', category: 'Hair', description: 'A relaxing hair spa session to nourish and condition hair.', defaultPrice: 1500, durationMinutes: 45, numberOfSessions: 1 },
  { name: 'Hair Botox / Keratin Smoothening', category: 'Hair', description: 'A smoothening treatment to reduce frizz and add shine.', defaultPrice: 5500, durationMinutes: 90, numberOfSessions: 1 },

  // --- Laser Hair Reduction ---
  { name: 'LHR - Full Face', category: 'Laser Hair Reduction', description: 'Laser hair reduction for the full face.', defaultPrice: 2000, durationMinutes: 30, numberOfSessions: 6 },
  { name: 'LHR - Underarms', category: 'Laser Hair Reduction', description: 'Laser hair reduction for the underarms.', defaultPrice: 1200, durationMinutes: 15, numberOfSessions: 6 },
  { name: 'LHR - Full Arms & Legs', category: 'Laser Hair Reduction', description: 'Laser hair reduction for the full arms and legs.', defaultPrice: 5000, durationMinutes: 60, numberOfSessions: 6 },
  { name: 'LHR - Full Body (Female)', category: 'Laser Hair Reduction', description: 'Full-body laser hair reduction.', defaultPrice: 8000, durationMinutes: 90, numberOfSessions: 6 },
  { name: 'LHR - Bikini Line', category: 'Laser Hair Reduction', description: 'Laser hair reduction for the bikini line.', defaultPrice: 1500, durationMinutes: 15, numberOfSessions: 6 },
  { name: 'LHR - Back & Shoulders', category: 'Laser Hair Reduction', description: 'Laser hair reduction for the back and shoulders.', defaultPrice: 4500, durationMinutes: 45, numberOfSessions: 6 },

  // --- Body ---
  { name: 'Body Contouring (Inch Loss)', category: 'Body', description: 'A body contouring treatment to help reduce inches.', defaultPrice: 4000, durationMinutes: 60, numberOfSessions: 6 },
  { name: 'RF Skin Tightening', category: 'Body', description: 'Radiofrequency therapy to help firm and tighten skin.', defaultPrice: 4500, durationMinutes: 45, numberOfSessions: 6 },
  { name: 'Cellulite Reduction Therapy', category: 'Body', description: 'A course of sessions targeting the appearance of cellulite.', defaultPrice: 3800, durationMinutes: 45, numberOfSessions: 6 },
  { name: 'Non-Surgical Fat Reduction', category: 'Body', description: 'A non-invasive treatment to target localized fat.', defaultPrice: 5500, durationMinutes: 60, numberOfSessions: 6 },

  // --- Men's Grooming ---
  { name: "Beard Shaping Facial", category: "Men's Grooming", description: 'A grooming facial including beard shaping and skin care.', defaultPrice: 2000, durationMinutes: 45, numberOfSessions: 1 },
  { name: "Men's Anti-Aging Facial", category: "Men's Grooming", description: 'An anti-aging facial tailored for men.', defaultPrice: 3000, durationMinutes: 45, numberOfSessions: 4 },
  { name: "Men's LHR - Beard/Face", category: "Men's Grooming", description: 'Laser hair reduction for beard shaping and facial hair.', defaultPrice: 2500, durationMinutes: 30, numberOfSessions: 6 },

  // --- Bridal ---
  { name: 'Bridal Glow Facial', category: 'Bridal', description: 'A pre-bridal facial for an instant glow ahead of the big day.', defaultPrice: 6000, durationMinutes: 90, numberOfSessions: 1 },

  // --- Weight Loss ---
  { name: 'Weight Loss Consultation & Diet Plan', category: 'Weight Loss', description: 'An initial consultation with a personalized diet and lifestyle plan.', defaultPrice: 1500, durationMinutes: 30, numberOfSessions: 1 },
  { name: 'Fat Freezing (Cryolipolysis)', category: 'Weight Loss', description: 'A non-invasive cooling treatment to target stubborn localized fat.', defaultPrice: 6000, durationMinutes: 60, numberOfSessions: 4 },
  { name: 'Inch Loss Body Wrap Therapy', category: 'Weight Loss', description: 'A body wrap treatment aimed at inch loss and skin firming.', defaultPrice: 3500, durationMinutes: 60, numberOfSessions: 6 },
  { name: 'Metabolic Boost Therapy', category: 'Weight Loss', description: 'A course of sessions designed to support metabolism as part of a weight-loss plan.', defaultPrice: 2500, durationMinutes: 30, numberOfSessions: 6 },
];

interface PackageSeed {
  name: string;
  description: string;
  discountPercent: number;
  validityDays: number;
  items: { treatmentName: string; quantity: number }[];
}

const packages: PackageSeed[] = [
  {
    name: 'Glow & Bright Skin Package',
    description: 'HydraFacial + Glow Peel combo for brighter, more even-toned skin.',
    discountPercent: 15,
    validityDays: 90,
    items: [
      { treatmentName: 'HydraFacial', quantity: 3 },
      { treatmentName: 'Glow Peel (Chemical Peel)', quantity: 3 },
    ],
  },
  {
    name: 'Acne-Free Clear Skin Package',
    description: 'A structured course to help manage active acne and residual pigmentation.',
    discountPercent: 20,
    validityDays: 120,
    items: [
      { treatmentName: 'Acne Clear Facial', quantity: 6 },
      { treatmentName: 'Pigmentation Correction Therapy', quantity: 2 },
    ],
  },
  {
    name: 'Anti-Aging Rejuvenation Package',
    description: 'Microneedling + PRP Facial combo for skin rejuvenation.',
    discountPercent: 15,
    validityDays: 120,
    items: [
      { treatmentName: 'Skin Microneedling', quantity: 4 },
      { treatmentName: 'PRP Facial (Vampire Facial)', quantity: 3 },
    ],
  },
  {
    name: 'Hair Regrowth Combo Package',
    description: 'PRP + GFC hair therapy with scalp care for hair fall and thinning.',
    discountPercent: 20,
    validityDays: 150,
    items: [
      { treatmentName: 'PRP Hair Regrowth Therapy', quantity: 4 },
      { treatmentName: 'GFC Hair Treatment', quantity: 4 },
      { treatmentName: 'Anti-Dandruff Scalp Therapy', quantity: 2 },
    ],
  },
  {
    name: 'Bridal Radiance Package',
    description: 'A pre-wedding glow-up combining skin, hair, and body treatments.',
    discountPercent: 10,
    validityDays: 60,
    items: [
      { treatmentName: 'HydraFacial', quantity: 2 },
      { treatmentName: 'Carbon Laser Facial', quantity: 1 },
      { treatmentName: 'Hair Spa & Nourishment', quantity: 2 },
      { treatmentName: 'RF Skin Tightening', quantity: 1 },
    ],
  },
  {
    name: 'Full Body Laser Hair Reduction Package',
    description: 'Full-body + underarms laser hair reduction bundle.',
    discountPercent: 25,
    validityDays: 180,
    items: [
      { treatmentName: 'LHR - Full Body (Female)', quantity: 6 },
      { treatmentName: 'LHR - Underarms', quantity: 6 },
    ],
  },
  {
    name: 'Complete Hair Care Package',
    description: 'Mesotherapy, scalp therapy, and hair spa for overall hair health.',
    discountPercent: 15,
    validityDays: 120,
    items: [
      { treatmentName: 'Hair Mesotherapy', quantity: 6 },
      { treatmentName: 'Anti-Dandruff Scalp Therapy', quantity: 4 },
      { treatmentName: 'Hair Spa & Nourishment', quantity: 2 },
    ],
  },
  {
    name: "Men's Grooming Package",
    description: 'Beard shaping, anti-aging facial, and laser grooming for men.',
    discountPercent: 15,
    validityDays: 120,
    items: [
      { treatmentName: 'Beard Shaping Facial', quantity: 2 },
      { treatmentName: "Men's Anti-Aging Facial", quantity: 4 },
      { treatmentName: "Men's LHR - Beard/Face", quantity: 6 },
    ],
  },
  {
    name: 'Bridal Complete Package',
    description: 'Full pre-bridal treatment plan covering skin, hair, and body.',
    discountPercent: 20,
    validityDays: 45,
    items: [
      { treatmentName: 'Bridal Glow Facial', quantity: 1 },
      { treatmentName: 'HydraFacial', quantity: 2 },
      { treatmentName: 'Hair Botox / Keratin Smoothening', quantity: 1 },
      { treatmentName: 'RF Skin Tightening', quantity: 2 },
      { treatmentName: 'Under-Eye Dark Circle Treatment', quantity: 2 },
    ],
  },
  {
    name: 'Total Body Confidence Package',
    description: 'Fat reduction, body contouring, and cellulite therapy combined.',
    discountPercent: 20,
    validityDays: 180,
    items: [
      { treatmentName: 'Non-Surgical Fat Reduction', quantity: 6 },
      { treatmentName: 'Body Contouring (Inch Loss)', quantity: 6 },
      { treatmentName: 'Cellulite Reduction Therapy', quantity: 4 },
    ],
  },
  {
    name: 'Botox Full Face Package',
    description: 'Forehead, crow’s feet, and frown lines treated together in one visit.',
    discountPercent: 15,
    validityDays: 30,
    items: [
      { treatmentName: 'Botox - Forehead Lines', quantity: 1 },
      { treatmentName: "Botox - Crow's Feet", quantity: 1 },
      { treatmentName: 'Botox - Frown Lines (Glabella)', quantity: 1 },
    ],
  },
  {
    name: 'Weight Loss Transformation Package',
    description: 'A structured weight-loss program combining consultation, fat freezing, and body therapies.',
    discountPercent: 20,
    validityDays: 180,
    items: [
      { treatmentName: 'Weight Loss Consultation & Diet Plan', quantity: 1 },
      { treatmentName: 'Fat Freezing (Cryolipolysis)', quantity: 4 },
      { treatmentName: 'Inch Loss Body Wrap Therapy', quantity: 6 },
      { treatmentName: 'Metabolic Boost Therapy', quantity: 6 },
    ],
  },
];

async function main() {
  const actingUser = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
    orderBy: { createdAt: 'asc' },
  });
  if (!actingUser) {
    console.error('No SUPER_ADMIN user found — run `npm run prisma:seed` first to create the admin account.');
    process.exit(1);
  }
  console.log(`Seeding catalog as ${actingUser.email}...\n`);

  const treatmentIdByName = new Map<string, string>();

  for (const t of treatments) {
    const existing = await prisma.treatment.findFirst({ where: { name: t.name } });
    if (existing) {
      treatmentIdByName.set(t.name, existing.id);
      console.log(`  - Treatment "${t.name}" already exists, skipping`);
      continue;
    }
    const created = await treatmentService.createTreatment(
      {
        name: t.name,
        category: t.category,
        description: t.description,
        defaultPrice: t.defaultPrice,
        durationMinutes: t.durationMinutes,
        numberOfSessions: t.numberOfSessions,
      },
      actingUser.id,
    );
    treatmentIdByName.set(t.name, created.id);
    console.log(`  + Created treatment: ${t.name}`);
  }

  console.log('');

  for (const p of packages) {
    const existing = await prisma.package.findFirst({ where: { name: p.name } });
    if (existing) {
      console.log(`  - Package "${p.name}" already exists, skipping`);
      continue;
    }

    const items = p.items.map((item) => {
      const treatmentId = treatmentIdByName.get(item.treatmentName);
      if (!treatmentId) {
        throw new Error(`Unknown treatment "${item.treatmentName}" referenced by package "${p.name}"`);
      }
      return { treatmentId, quantity: item.quantity };
    });

    const bundleValue = p.items.reduce((sum, item) => {
      const treatment = treatments.find((t) => t.name === item.treatmentName)!;
      return sum + treatment.defaultPrice * item.quantity;
    }, 0);
    const defaultPrice = Math.round(bundleValue * (1 - p.discountPercent / 100));

    await packageService.createPackage(
      {
        name: p.name,
        description: p.description,
        defaultPrice,
        discountPercent: p.discountPercent,
        validityDays: p.validityDays,
        items,
      },
      actingUser.id,
    );
    console.log(`  + Created package: ${p.name} (₹${defaultPrice})`);
  }

  console.log('\nCatalog seeding complete.');
}

main()
  .catch((err) => {
    console.error('Catalog seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
