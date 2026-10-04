// Seeds 2 locally-targeted blog articles aimed at Gurgaon/local-SEO search
// intent (e.g. "skin clinic near Sector 86", "skin clinic in Gurgaon") —
// complements the areaServed/footer changes in the website for local SEO.
// Requires a Super Admin account to already exist (run `npm run prisma:seed`
// first) — posts are attributed to that admin as their author.
//
// Usage: npm run prisma:seed:blog:local
// Safe to re-run — skips any post whose slug already exists.
import { BlogCategory, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  readTimeMinutes: number;
  publishedAt: string;
  content: string[];
}

const DISCLAIMER =
  'This article is for general educational purposes and isn’t a substitute for a professional consultation. Everyone’s skin, hair, and body respond differently — book a consultation with our doctors before starting any treatment.';

const seedPosts: SeedPost[] = [
  {
    slug: 'skin-hair-clinic-near-sector-86-gurugram',
    title: 'Skin & Hair Treatments Near Sector 86 and Pataudi Road, Gurugram',
    excerpt:
      'Looking for a skin or hair clinic around Sector 86, Pataudi Road, or nearby parts of Gurugram? Here’s what’s worth knowing before you book.',
    readTimeMinutes: 4,
    publishedAt: '2026-09-01',
    content: [
      'Gurugram has grown quickly along Pataudi Road and the sectors around it — Sector 86 and its neighbouring sectors, extending toward Sohna Road, Golf Course Road, and New Gurgaon — and skin and hair clinics have followed that growth. For residents in this part of the city, that generally means not having to travel into the older, more congested parts of Gurugram for a proper consultation.',
      'If you’re comparing clinics in this stretch of the city, the same basics apply as anywhere else: is there an actual doctor involved in your consultation and treatment plan, rather than treatments being recommended by non-medical staff? Is the clinic transparent about what a treatment can realistically achieve, and upfront about pricing only after understanding your specific skin, hair, or weight-management goals?',
      'Proximity matters more than people sometimes expect for ongoing treatments — many skin and hair concerns (acne, pigmentation, hair thinning) are managed over a series of visits spaced weeks apart, so a clinic that’s a short drive away along Pataudi Road, Sohna Road, or within Sector 86 and nearby sectors makes it genuinely easier to stay consistent with a treatment plan than one that requires crossing the city each time.',
      'Lumine Aesthetics is based in Sector 86 on Pataudi Road, and sees patients from across this part of Gurugram — including Sohna Road, Golf Course Road, New Gurgaon, and Manesar — for doctor-led skin, hair, and aesthetic care. A consultation is the best way to get a plan specific to you, rather than generic advice.',
      DISCLAIMER,
    ],
  },
  {
    slug: 'why-gurgaon-choosing-doctor-led-skin-clinics',
    title: 'Why More Gurgaon Residents Are Choosing Doctor-Led Skin Clinics',
    excerpt:
      'Gurgaon has no shortage of salons and spas offering skin treatments — here’s why more people are specifically seeking out doctor-led clinics instead.',
    readTimeMinutes: 4,
    publishedAt: '2026-09-04',
    content: [
      'Gurgaon’s skin and hair care market has expanded rapidly over the last several years, and a lot of that growth has come from salons and beauty parlours adding “skin treatments” — facials, peels, even laser — alongside their regular services. For straightforward grooming, that’s often fine. For an actual skin or hair concern, it’s a different situation.',
      'The key difference is assessment. A salon typically offers a fixed menu of treatments regardless of what’s actually causing your concern, while a doctor-led clinic starts with understanding why a concern is happening — hormonal acne needs a different approach than diet-related breakouts, for instance — before recommending anything. That assessment step is often what determines whether a treatment actually works for a particular person.',
      'There’s also a safety dimension that matters more as treatments get more involved. Chemical peels, laser treatments, and injectables all carry some risk if the wrong strength or technique is used on the wrong skin type, and a non-medical setting is less equipped to handle an adverse reaction if one occurs, or to adjust a treatment plan based on how skin is actually responding over time.',
      'This is part of why Gurgaon has seen a shift toward dedicated, doctor-led skin and hair clinics rather than relying on salons for anything beyond basic grooming — people are increasingly treating skin and hair concerns the way they’d treat any other health concern, starting with a proper consultation rather than a fixed-menu treatment.',
      DISCLAIMER,
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
  console.log(`Seeding local-SEO blog articles as ${actingUser.email}...\n`);

  for (const post of seedPosts) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) {
      console.log(`  - Post "${post.slug}" already exists, skipping`);
      continue;
    }

    await prisma.blogPost.create({
      data: {
        slug: post.slug,
        title: post.title,
        category: BlogCategory.GENERAL,
        excerpt: post.excerpt,
        content: post.content,
        readTimeMinutes: post.readTimeMinutes,
        isPublished: true,
        publishedAt: new Date(post.publishedAt),
        createdById: actingUser.id,
        tags: {
          connectOrCreate: [
            { where: { slug: 'gurgaon-local' }, create: { slug: 'gurgaon-local', name: 'Gurgaon & Local Area' } },
          ],
        },
      },
    });
    console.log(`  + Created post: ${post.title}`);
  }

  console.log('\nLocal-SEO blog seeding complete.');
}

main()
  .catch((err) => {
    console.error('Local-SEO blog seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
