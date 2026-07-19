import Link from 'next/link';
import { fetchPublicTreatments } from '@/lib/api';
import { siteConfig } from '@/config/site';

const highlights = [
  { title: 'Doctor-led care', copy: 'Every treatment plan is reviewed and overseen by our in-house doctors.' },
  { title: 'Personalized pricing', copy: 'Your plan is priced for your skin and hair, not a one-size menu.' },
  { title: 'Progress you can track', copy: 'Session-by-session follow-up so you always know what’s next.' },
];

export default async function HomePage() {
  const treatments = await fetchPublicTreatments();
  const featured = treatments.slice(0, 3);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blush-600">
          {siteConfig.tagline}
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-charcoal-900 md:text-6xl">
          Look and feel like the best version of you
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-charcoal-700">{siteConfig.description}</p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-full bg-blush-600 px-7 py-3 text-sm font-medium text-white transition hover:bg-blush-700"
          >
            Book a Consultation
          </Link>
          <Link
            href="/services"
            className="rounded-full border border-blush-300 px-7 py-3 text-sm font-medium text-blush-700 transition hover:bg-blush-50"
          >
            Explore Treatments
          </Link>
        </div>
      </section>

      <section className="bg-cream-100 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-2xl bg-cream-50 p-8 shadow-sm">
              <h3 className="font-serif text-xl text-blush-700">{h.title}</h3>
              <p className="mt-3 text-sm text-charcoal-700">{h.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl text-charcoal-900">Popular Treatments</h2>
            <Link href="/services" className="text-sm font-medium text-blush-600 hover:text-blush-700">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((t) => (
              <div key={t.id} className="rounded-2xl border border-blush-100 p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-blush-600">{t.category}</p>
                <h3 className="mt-2 font-serif text-lg text-charcoal-900">{t.name}</h3>
                {t.description && <p className="mt-2 text-sm text-charcoal-700 line-clamp-3">{t.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
