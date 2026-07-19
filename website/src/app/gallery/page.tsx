import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Gallery',
  description: `Before/after results and clinic photos from ${siteConfig.name}.`,
  alternates: { canonical: '/gallery' },
};

// Placeholder tiles — replace the `label`s with real before/after photos once
// available (drop images in /public and swap these divs for <Image> tags).
const placeholders = Array.from({ length: 6 }, (_, i) => `Result ${i + 1}`);

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-blush-600">Gallery</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Real Results</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        Photos coming soon. Follow{' '}
        <a
          href={siteConfig.instagramUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-blush-600 hover:text-blush-700"
        >
          {siteConfig.instagramHandle}
        </a>{' '}
        for the latest before/after highlights.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {placeholders.map((label) => (
          <div
            key={label}
            className="flex aspect-square items-center justify-center rounded-2xl bg-cream-200 text-sm text-charcoal-700"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Like what you see?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Book a consultation to discuss your own treatment plan.</p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-blush-600 px-7 py-3 text-sm font-medium text-white hover:bg-blush-700"
        >
          Book a Consultation
        </Link>
      </div>
    </div>
  );
}
