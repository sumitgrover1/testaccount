import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchPublicTreatments, type PublicTreatment } from '@/lib/api';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Skin & Hair Treatments',
  description: `Explore our skin, hair, and aesthetic treatments at ${siteConfig.name} in ${siteConfig.city}. Personalized pricing after a consultation.`,
  alternates: { canonical: '/services' },
};

function groupByCategory(treatments: PublicTreatment[]) {
  const groups = new Map<string, PublicTreatment[]>();
  for (const t of treatments) {
    const list = groups.get(t.category) ?? [];
    list.push(t);
    groups.set(t.category, list);
  }
  return groups;
}

export default async function ServicesPage() {
  const treatments = await fetchPublicTreatments();
  const groups = groupByCategory(treatments);

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">Services</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Treatments</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        Pricing is personalized after a consultation — reach out and our team will recommend a plan
        for your goals.
      </p>

      {groups.size === 0 ? (
        <p className="mt-12 text-charcoal-700">
          Our treatment list is being updated — please{' '}
          <Link href="/contact" className="font-medium text-brand-600 hover:text-brand-700">
            contact us
          </Link>{' '}
          to ask about a specific service.
        </p>
      ) : (
        <div className="mt-12 space-y-12">
          {Array.from(groups.entries()).map(([category, items]) => (
            <div key={category}>
              <h2 className="font-serif text-2xl text-brand-700">{category}</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {items.map((t) => (
                  <div key={t.id} className="flex flex-col rounded-2xl border border-brand-100 p-6">
                    <h3 className="font-serif text-lg text-charcoal-900">{t.name}</h3>
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
    </div>
  );
}
