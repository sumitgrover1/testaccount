import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchGoogleReviews } from '@/lib/api';
import { siteConfig } from '@/config/site';

const title = 'Testimonials';
const description = `Real patient testimonials and Google reviews for ${siteConfig.name}, a skin and hair clinic in ${siteConfig.city}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/testimonials' },
  openGraph: { title, description, url: '/testimonials' },
  twitter: { title, description },
};

// Placeholder testimonials — shown only until real Google reviews are
// configured (see GOOGLE_PLACES_API_KEY/GOOGLE_PLACE_ID in the backend .env).
const placeholderTestimonials = [
  { quote: 'Placeholder testimonial — replace with a real patient review.', name: 'Patient Name' },
  { quote: 'Placeholder testimonial — replace with a real patient review.', name: 'Patient Name' },
  { quote: 'Placeholder testimonial — replace with a real patient review.', name: 'Patient Name' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-brand-500" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(Math.round(rating))}
      <span className="text-brand-100">{'★'.repeat(5 - Math.round(rating))}</span>
    </div>
  );
}

export default async function TestimonialsPage() {
  const googleReviews = await fetchGoogleReviews();
  const hasRealReviews = googleReviews.configured && googleReviews.reviews.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">Testimonials</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">What Our Patients Say</h1>

      {hasRealReviews ? (
        <>
          {googleReviews.rating && (
            <p className="mt-4 flex items-center gap-2 text-charcoal-700">
              <Stars rating={googleReviews.rating} />
              <span className="text-sm">
                {googleReviews.rating.toFixed(1)} out of 5
                {googleReviews.totalReviews ? ` · based on ${googleReviews.totalReviews} Google reviews` : ''}
              </span>
            </p>
          )}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {googleReviews.reviews.map((r) => (
              <div key={r.time} className="rounded-2xl border border-brand-100 bg-cream-50 p-8">
                <Stars rating={r.rating} />
                <p className="mt-3 text-sm italic text-charcoal-700">&ldquo;{r.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-brand-700">
                  — {r.authorName}
                  <span className="ml-2 font-normal text-charcoal-700">{r.relativeTimeDescription}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-charcoal-700">Reviews sourced from Google Business Profile.</p>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-2xl text-charcoal-700">
            These are placeholders — swap them for real reviews once you have a few, ideally with the
            patient&apos;s consent to use their name.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {placeholderTestimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-brand-100 bg-cream-50 p-8">
                <p className="text-sm italic text-charcoal-700">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-brand-700">— {t.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-10 text-sm text-charcoal-700">
        Also see reviews on{' '}
        <a
          href={siteConfig.instagramUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Instagram
        </a>
        .
      </p>

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Ready to start your own story?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Book a consultation with our team today.</p>
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
