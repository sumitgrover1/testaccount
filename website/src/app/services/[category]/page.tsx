import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicTreatments } from '@/lib/api';
import { siteConfig } from '@/config/site';
import { slugify } from '@/lib/slug';
import { CATEGORY_CONTENT } from '@/lib/categoryContent';
import { CategoryIconBadge } from '@/lib/categoryIcon';
import { JsonLd } from '@/components/JsonLd';

// Category existence/content comes entirely from the static CATEGORY_CONTENT
// list, not a live API call — so these pages render correctly (intro copy,
// schema, breadcrumbs) even if the backend is briefly unreachable. Only the
// live treatment grid underneath degrades gracefully (same "being updated"
// fallback the /services hub page already uses), rather than the whole page
// 404ing on a backend hiccup. No generateStaticParams either, matching
// blog/[slug]'s existing pattern — the backend isn't guaranteed reachable
// at Docker build time, so these render on demand per request instead.
function resolveCategory(categorySlug: string) {
  return CATEGORY_CONTENT.find((c) => slugify(c.category) === categorySlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const content = resolveCategory(category);
  if (!content) return {};
  const { metaTitle, metaDescription } = content;
  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: `/services/${category}` },
    openGraph: { title: metaTitle, description: metaDescription, url: `/services/${category}` },
    twitter: { title: metaTitle, description: metaDescription },
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const content = resolveCategory(categorySlug);
  if (!content) notFound();

  const treatments = await fetchPublicTreatments();
  const items = treatments.filter((t) => t.category === content.category);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteConfig.url}/services` },
      { '@type': 'ListItem', position: 3, name: content.heading, item: `${siteConfig.url}/services/${categorySlug}` },
    ],
  };
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: content.heading,
    serviceType: content.category,
    provider: { '@type': 'MedicalBusiness', name: siteConfig.name, url: siteConfig.url },
    areaServed: [
      { '@type': 'City', name: siteConfig.city },
      ...siteConfig.areasServed.map((a) => ({ '@type': 'Place', name: a })),
    ],
  };

  const otherCategories = CATEGORY_CONTENT.filter((c) => c.category !== content.category);

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={serviceSchema} />

      <nav className="text-sm text-charcoal-700" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>{' '}
        /{' '}
        <Link href="/services" className="hover:text-brand-600">
          Services
        </Link>{' '}
        / <span className="text-charcoal-900">{content.category}</span>
      </nav>

      <div className="mt-4 flex items-center gap-2">
        <CategoryIconBadge category={content.category} className="h-6 w-6 text-brand-500" />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">Services</p>
      </div>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-900">{content.heading}</h1>
      <div className="mt-4 max-w-2xl space-y-3 text-charcoal-700">
        {content.intro.map((para) => (
          <p key={para}>{para}</p>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-charcoal-700">
          Our {content.category.toLowerCase()} list is being updated — please{' '}
          <Link href="/contact" className="font-medium text-brand-600 hover:text-brand-700">
            contact us
          </Link>{' '}
          to ask about availability.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {items.map((t) => (
            <div key={t.id} className="flex flex-col rounded-2xl border border-brand-100 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <CategoryIconBadge category={content.category} className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-serif text-lg text-charcoal-900">{t.name}</h3>
              {t.description && <p className="mt-2 text-sm text-charcoal-700">{t.description}</p>}
              <p className="mt-3 text-xs text-charcoal-700">
                {t.durationMinutes} min · {t.numberOfSessions} session
                {t.numberOfSessions > 1 ? 's' : ''}
              </p>
              <Link
                href={`/contact?treatment=${encodeURIComponent(t.name)}`}
                className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Enquire about this →
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Not sure what you need?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Book a consultation and we&apos;ll guide you.</p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-brand-600 px-7 py-3 text-sm font-medium text-white hover:bg-brand-700"
        >
          Book a Consultation
        </Link>
      </div>

      <div className="mt-16 border-t border-brand-100 pt-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-charcoal-800">Other services</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {otherCategories.map((c) => (
            <Link
              key={c.category}
              href={`/services/${slugify(c.category)}`}
              className="rounded-full border border-brand-100 px-4 py-2 text-sm text-charcoal-700 hover:border-brand-300 hover:text-brand-600"
            >
              {c.category}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
