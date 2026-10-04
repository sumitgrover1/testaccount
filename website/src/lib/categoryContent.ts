import { siteConfig } from '@/config/site';

export interface CategoryContent {
  // Matches the free-text Treatment.category string from the backend
  // (case-sensitive) — see slug.ts for how a category becomes a URL.
  category: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string[];
}

// Hand-written, locally-contextualized content for each treatment category
// page (/services/[category]) — one real landing page per category rather
// than one per individual treatment, since most individual treatments
// (especially the six near-identical "Laser Hair Reduction — <body part>"
// entries) don't have enough distinct substance to justify their own page
// without reading as thin/duplicate content to search engines. Category
// pages group real content under the higher-volume, higher-intent search
// terms people actually use ("laser hair removal Gurgaon" far outranks
// "LHR back and shoulders Gurgaon").
export const CATEGORY_CONTENT: CategoryContent[] = [
  {
    category: 'Skin',
    metaTitle: `Skin Treatments in ${siteConfig.city}`,
    metaDescription: `Doctor-led skin treatments in ${siteConfig.city} — facials, peels, acne and pigmentation therapy, microneedling, PRP, and anti-aging injectables. Personalized pricing after a consultation.`,
    heading: `Skin Treatments in ${siteConfig.city}`,
    intro: [
      `From everyday dullness to specific concerns like acne, pigmentation, and early signs of aging, our skin treatments in ${siteConfig.city} are built around an actual assessment of your skin — not a fixed menu applied the same way to everyone.`,
      'Every plan starts with a doctor looking at your skin type, concern, and history before recommending anything, and is adjusted over your course of sessions based on how your skin actually responds.',
    ],
  },
  {
    category: 'Hair',
    metaTitle: `Hair Treatments in ${siteConfig.city}`,
    metaDescription: `Hair thinning, hair fall, and scalp treatments in ${siteConfig.city} — PRP, GFC, mesotherapy, and anti-dandruff scalp therapy. Doctor-assessed, not a fixed package.`,
    heading: `Hair Treatments in ${siteConfig.city}`,
    intro: [
      `Hair fall and thinning have a lot of possible underlying causes — hormonal, nutritional, stress-related, or genetic — so our hair treatments in ${siteConfig.city} start with understanding what's actually driving your specific concern, rather than assuming one protocol fits every case.`,
      'Treatments like PRP and GFC work by supporting the hair follicles directly, and tend to work best as a planned course of sessions rather than a one-off visit — your doctor will walk you through a realistic timeline before you start.',
    ],
  },
  {
    category: 'Laser Hair Reduction',
    metaTitle: `Laser Hair Reduction in ${siteConfig.city}`,
    metaDescription: `Laser hair reduction in ${siteConfig.city} for face, underarms, arms, legs, back, and full body. Not to be confused with hair-fall treatment — this is permanent hair reduction.`,
    heading: `Laser Hair Reduction in ${siteConfig.city}`,
    intro: [
      `Laser hair reduction (LHR) uses targeted light energy to reduce unwanted hair growth over a course of sessions — it's a different category from our Hair treatments above, which address hair fall and scalp health rather than hair removal.`,
      `We offer LHR across individual areas (face, underarms, bikini line) and larger areas (full arms and legs, full body) for patients across ${siteConfig.city}, with sessions spaced to match the hair growth cycle for lasting reduction rather than a quick, temporary result.`,
    ],
  },
  {
    category: 'Body',
    metaTitle: `Body Contouring & Skin Tightening in ${siteConfig.city}`,
    metaDescription: `Non-surgical body contouring, RF skin tightening, and cellulite reduction in ${siteConfig.city}. A realistic, doctor-guided plan rather than a one-session promise.`,
    heading: `Body Contouring & Skin Tightening in ${siteConfig.city}`,
    intro: [
      `Non-surgical body treatments — contouring, radiofrequency skin tightening, cellulite reduction — can meaningfully improve texture and firmness for the right candidate, but they work gradually and are not a substitute for diet, exercise, or significant weight loss.`,
      `We're upfront about what these treatments can and can't do for your specific body and goals before recommending a course of sessions, so you know what to realistically expect.`,
    ],
  },
  {
    category: "Men's Grooming",
    metaTitle: `Men's Skin & Grooming Treatments in ${siteConfig.city}`,
    metaDescription: `Skin and grooming treatments for men in ${siteConfig.city} — beard shaping facials, anti-aging facials, and laser hair reduction for the face and beard area.`,
    heading: `Men's Skin & Grooming Treatments in ${siteConfig.city}`,
    intro: [
      `Men's skin tends to differ from women's in oil production, thickness, and how it responds to shaving and grooming — our men's treatments in ${siteConfig.city} are formulated and dosed with that in mind, rather than simply offering a smaller version of a women's facial.`,
      "Whether you're dealing with early signs of aging, want cleaner beard definition, or want to reduce facial hair growth long-term, a quick consultation will tell you which of these actually fits your skin and goals.",
    ],
  },
  {
    category: 'Bridal',
    metaTitle: `Bridal Skin & Hair Packages in ${siteConfig.city}`,
    metaDescription: `Pre-bridal skin and hair prep in ${siteConfig.city}, planned around your wedding date rather than squeezed into a single last-minute session.`,
    heading: `Bridal Skin & Hair Packages in ${siteConfig.city}`,
    intro: [
      `The biggest mistake with bridal prep is starting too late — most skin and hair treatments need a course of sessions spaced weeks apart to show real results, so a visible "glow" the week of your wedding is really the result of a plan that started months earlier.`,
      `We build a bridal timeline backward from your wedding date, combining the right skin and hair treatments from our full catalog with a final pre-wedding glow facial, rather than treating bridal care as a single bolt-on session.`,
    ],
  },
  {
    category: 'Weight Loss',
    metaTitle: `Weight Management Treatments in ${siteConfig.city}`,
    metaDescription: `Doctor-guided weight management in ${siteConfig.city} — diet planning, fat freezing, and metabolic support, built around sustainable change rather than a quick fix.`,
    heading: `Weight Management Treatments in ${siteConfig.city}`,
    intro: [
      `Sustainable weight management is mostly about diet, activity, and consistency — our role is to support that with a realistic plan and, where appropriate, non-invasive treatments like fat freezing for stubborn localized fat that doesn't respond to diet and exercise alone.`,
      "We start with a consultation and a personalized diet plan before recommending any additional treatment, since no in-clinic session replaces the fundamentals of sustainable weight management.",
    ],
  },
];

export function getCategoryContent(category: string): CategoryContent | undefined {
  return CATEGORY_CONTENT.find((c) => c.category === category);
}
