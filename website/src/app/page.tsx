import Link from 'next/link';
import { fetchPublicTreatments } from '@/lib/api';
import { siteConfig, buildWhatsAppUrl } from '@/config/site';

const highlights = [
  { title: 'Doctor-led care', copy: 'Every treatment plan is reviewed and overseen by our in-house doctors.' },
  { title: 'Personalized pricing', copy: 'Your plan is priced for your skin and hair, not a one-size menu.' },
  { title: 'Progress you can track', copy: 'Session-by-session follow-up so you always know what’s next.' },
];

const trustBadges = [
  'Doctor-Led Assessments',
  'Personalized Treatment Plans',
  'Hygienic, Clinical Standards',
  'Located in Sector 86, Gurugram',
];

const faqTeasers = [
  {
    question: 'How much will my treatment cost?',
    answer:
      'We don’t publish a fixed price list — pricing depends on your skin/hair and goals. Book a consultation for a clear, itemized plan.',
  },
  {
    question: 'Are your treatments doctor-supervised?',
    answer: 'Yes — every plan is assessed and overseen by our in-house doctors from start to finish.',
  },
];

export default async function HomePage() {
  const treatments = await fetchPublicTreatments();
  const featured = treatments.slice(0, 3);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">
          {siteConfig.tagline}
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-charcoal-900 md:text-6xl">
          Look and feel like the best version of you
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-charcoal-700">{siteConfig.description}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-full bg-brand-600 px-7 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Book a Consultation
          </Link>
          <a
            href={buildWhatsAppUrl("Hi, I'd like to book a consultation at Lumine Aesthetics.")}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full bg-[#25D366] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Chat on WhatsApp
          </a>
          <Link
            href="/services"
            className="rounded-full border border-brand-300 px-7 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            Explore Treatments
          </Link>
        </div>

        <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-charcoal-700">
          {trustBadges.map((badge) => (
            <li key={badge} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
              {badge}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-cream-100 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-2xl bg-cream-50 p-8 shadow-sm">
              <h3 className="font-serif text-xl text-brand-700">{h.title}</h3>
              <p className="mt-3 text-sm text-charcoal-700">{h.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl text-charcoal-900">Popular Treatments</h2>
            <Link href="/services" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((t) => (
              <Link
                key={t.id}
                href={`/contact?treatment=${encodeURIComponent(t.name)}`}
                className="rounded-2xl border border-brand-100 p-6 transition hover:border-brand-300 hover:shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{t.category}</p>
                <h3 className="mt-2 font-serif text-lg text-charcoal-900">{t.name}</h3>
                {t.description && <p className="mt-2 text-sm text-charcoal-700 line-clamp-3">{t.description}</p>}
                <p className="mt-3 text-sm font-medium text-brand-600">Enquire about this →</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-cream-100 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-serif text-3xl text-charcoal-900">Common Questions</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {faqTeasers.map((f) => (
              <div key={f.question} className="rounded-2xl bg-cream-50 p-6">
                <h3 className="font-serif text-base text-brand-700">{f.question}</h3>
                <p className="mt-2 text-sm text-charcoal-700">{f.answer}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/faq" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              See all FAQs →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="font-serif text-3xl text-charcoal-900">Not sure where to start?</h2>
        <p className="mx-auto mt-3 max-w-xl text-charcoal-700">
          Book a consultation and our doctors will recommend a plan built around your skin, hair, and
          goals — no fixed menu, no guesswork.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-full bg-brand-600 px-7 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Book a Consultation
          </Link>
          <a
            href={`tel:${siteConfig.phone}`}
            className="rounded-full border border-brand-300 px-7 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            Call {siteConfig.phoneDisplay}
          </a>
        </div>
      </section>
    </div>
  );
}
