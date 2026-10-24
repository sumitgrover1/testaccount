import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { slugify } from '@/lib/slug';
import { CATEGORY_CONTENT } from '@/lib/categoryContent';
import { CategoryIconBadge } from '@/lib/categoryIcon';
import { JsonLd } from '@/components/JsonLd';
import { EnquiryForm } from '@/components/EnquiryForm';

const title = `Skin & Hair Clinic in ${siteConfig.city}`;
const description = `${siteConfig.name} is a doctor-led skin, hair & aesthetic clinic in ${siteConfig.city}, serving ${siteConfig.areasServed.join(', ')}. Book a consultation today.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/gurugram' },
  openGraph: { title, description, url: '/gurugram' },
  twitter: { title, description },
};

export default function GurugramPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: title, item: `${siteConfig.url}/gurugram` },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <JsonLd data={breadcrumbSchema} />

      <nav className="text-sm text-charcoal-700" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>{' '}
        / <span className="text-charcoal-900">{siteConfig.city}</span>
      </nav>

      <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-brand-600">{siteConfig.city}</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-900">{title}</h1>
      <div className="mt-4 max-w-2xl space-y-3 text-charcoal-700">
        <p>
          {siteConfig.name} is based in {siteConfig.address.line2}, offering doctor-led skin, hair, and
          aesthetic care rather than a fixed treatment menu — every plan starts with an actual
          consultation, assessed and overseen by our in-house doctors.
        </p>
        <p>
          We regularly see patients from across {siteConfig.city}, including {siteConfig.areasServed.join(', ')},
          and the wider Delhi NCR area. Being close by makes it easier to stay consistent with a treatment
          plan — many skin and hair concerns are managed over a course of sessions, not a single visit.
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-2xl text-brand-700">Areas we serve near {siteConfig.city}</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {siteConfig.areasServed.map((area) => (
            <li
              key={area}
              className="rounded-full border border-brand-100 px-4 py-2 text-sm text-charcoal-700"
            >
              {area}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-2xl text-brand-700">What we treat in {siteConfig.city}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CATEGORY_CONTENT.map((c) => (
            <Link
              key={c.category}
              href={`/services/${slugify(c.category)}`}
              className="flex items-center gap-3 rounded-2xl border border-brand-100 p-5 transition hover:border-brand-300"
            >
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <CategoryIconBadge category={c.category} className="h-5 w-5" />
              </div>
              <span className="font-serif text-lg text-charcoal-900">{c.category}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-16 grid gap-12 border-t border-brand-100 pt-12 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl text-brand-700">Book a Consultation</h2>
          <p className="mt-2 text-sm text-charcoal-700">
            Tell us a bit about what you&apos;re looking for and our {siteConfig.city} team will call
            you back.
          </p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <EnquiryForm />
            </Suspense>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-lg text-brand-700">Visit Us in {siteConfig.city}</h2>
            <a
              href={siteConfig.address.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block text-sm text-charcoal-700 hover:text-brand-600"
            >
              {siteConfig.address.line1}
              <br />
              {siteConfig.address.line2}
            </a>
            <div className="mt-4 overflow-hidden rounded-2xl border border-brand-100">
              <iframe
                title={`${siteConfig.name} location on Google Maps`}
                src={siteConfig.address.mapsEmbedUrl}
                loading="lazy"
                className="h-64 w-full border-0"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div>
            <h2 className="font-serif text-lg text-brand-700">Call or Message</h2>
            <a href={`tel:${siteConfig.phone}`} className="mt-1 block text-sm text-charcoal-700 hover:text-brand-600">
              {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
