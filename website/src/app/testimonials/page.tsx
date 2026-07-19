import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: `Testimonials — ${siteConfig.name}` };

// Placeholder testimonials — replace with real patient reviews (with
// permission) before launch.
const testimonials = [
  {
    quote: 'Placeholder testimonial — replace with a real patient review.',
    name: 'Patient Name',
  },
  {
    quote: 'Placeholder testimonial — replace with a real patient review.',
    name: 'Patient Name',
  },
  {
    quote: 'Placeholder testimonial — replace with a real patient review.',
    name: 'Patient Name',
  },
];

export default function TestimonialsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-blush-600">Testimonials</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">What Our Patients Say</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        These are placeholders — swap them for real reviews once you have a few, ideally with the
        patient&apos;s consent to use their name.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-2xl border border-blush-100 bg-cream-50 p-8">
            <p className="text-sm italic text-charcoal-700">&ldquo;{t.quote}&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-blush-700">— {t.name}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-charcoal-700">
        Also see reviews on{' '}
        <a
          href={siteConfig.instagramUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-blush-600 hover:text-blush-700"
        >
          Instagram
        </a>
        .
      </p>
    </div>
  );
}
