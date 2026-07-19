import Link from 'next/link';
import { fetchPublicTreatments, fetchGoogleReviews, fetchInstagramGallery } from '@/lib/api';
import { siteConfig, buildWhatsAppUrl } from '@/config/site';
import { CategoryIconBadge } from '@/lib/categoryIcon';
import { HeroVisual } from '@/components/HeroVisual';

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

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-brand-500" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(Math.round(rating))}
      <span className="text-brand-100">{'★'.repeat(5 - Math.round(rating))}</span>
    </div>
  );
}

export default async function HomePage() {
  const [treatments, googleReviews, instagram] = await Promise.all([
    fetchPublicTreatments(),
    fetchGoogleReviews(),
    fetchInstagramGallery(),
  ]);
  const featured = treatments.slice(0, 3);
  const featuredReviews = googleReviews.reviews.slice(0, 3);
  const featuredPosts = instagram.posts.slice(0, 4);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">
              {siteConfig.tagline}
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-charcoal-900 md:text-6xl">
              Look and feel like the best version of you
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-charcoal-700 md:mx-0">{siteConfig.description}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
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

            <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-charcoal-700 md:mx-0 md:justify-start">
              {trustBadges.map((badge) => (
                <li key={badge} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block">
            <HeroVisual />
          </div>
        </div>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <CategoryIconBadge category={t.category} className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-600">{t.category}</p>
                <h3 className="mt-2 font-serif text-lg text-charcoal-900">{t.name}</h3>
                {t.description && <p className="mt-2 text-sm text-charcoal-700 line-clamp-3">{t.description}</p>}
                <p className="mt-3 text-sm font-medium text-brand-600">Enquire about this →</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredReviews.length > 0 && (
        <section className="bg-cream-100 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="font-serif text-3xl text-charcoal-900">What Our Patients Say</h2>
              {googleReviews.rating && (
                <p className="mt-2 flex items-center justify-center gap-2 text-charcoal-700">
                  <Stars rating={googleReviews.rating} />
                  <span className="text-sm">
                    {googleReviews.rating.toFixed(1)} out of 5
                    {googleReviews.totalReviews ? ` · ${googleReviews.totalReviews} Google reviews` : ''}
                  </span>
                </p>
              )}
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featuredReviews.map((r) => (
                <div key={r.time} className="rounded-2xl bg-cream-50 p-6 shadow-sm">
                  <Stars rating={r.rating} />
                  <p className="mt-3 text-sm italic text-charcoal-700 line-clamp-4">&ldquo;{r.text}&rdquo;</p>
                  <p className="mt-4 text-sm font-semibold text-brand-700">— {r.authorName}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/testimonials" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Read all reviews →
              </Link>
            </div>
          </div>
        </section>
      )}

      {featuredPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl text-charcoal-900">From Our Instagram</h2>
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Follow {siteConfig.instagramHandle} →
            </a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {featuredPosts.map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block aspect-square overflow-hidden rounded-2xl bg-cream-200"
              >
                {/* Plain <img>, not next/image: Instagram's CDN hosts vary
                    unpredictably, so a remotePatterns allowlist isn't a good fit here. */}
                <img
                  src={post.imageUrl}
                  alt={post.caption ?? `${siteConfig.name} on Instagram`}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="bg-cream-100 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">About Us</p>
            <h2 className="mt-3 font-serif text-3xl text-charcoal-900">{siteConfig.name}</h2>
            <p className="mt-4 text-charcoal-700">{siteConfig.description}</p>
            <Link href="/about" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
              Learn more about us →
            </Link>
          </div>
          <div className="rounded-2xl bg-cream-50 p-8 shadow-sm">
            <h3 className="font-serif text-xl text-brand-700">Our Approach</h3>
            <p className="mt-3 text-sm text-charcoal-700">
              Every patient is assessed by a doctor before any treatment begins. Plans are tailored to
              your skin, hair, and goals, and progress is tracked session by session.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-serif text-3xl text-charcoal-900">Common Questions</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {faqTeasers.map((f) => (
              <div key={f.question} className="rounded-2xl bg-cream-100 p-6">
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
