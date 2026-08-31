import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchInstagramGallery } from '@/lib/api';
import { siteConfig } from '@/config/site';

const title = 'Gallery';
const description = `Before/after results and clinic photos from ${siteConfig.name}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/gallery' },
  openGraph: { title, description, url: '/gallery' },
  twitter: { title, description },
};

// Placeholder tiles — shown only until INSTAGRAM_ACCESS_TOKEN is configured
// on the backend (see instagram.service.ts).
const placeholders = Array.from({ length: 6 }, (_, i) => `Result ${i + 1}`);

export default async function GalleryPage() {
  const instagram = await fetchInstagramGallery();
  const hasPosts = instagram.configured && instagram.posts.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">Gallery</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Real Results</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        {hasPosts ? 'Straight from our Instagram — ' : 'Photos coming soon. '}Follow{' '}
        <a
          href={siteConfig.instagramUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          {siteConfig.instagramHandle}
        </a>{' '}
        for the latest before/after highlights.
      </p>

      {hasPosts ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {instagram.posts.map((post) =>
            post.videoUrl ? (
              <div key={post.id} className="relative aspect-square overflow-hidden rounded-2xl bg-cream-200">
                <video
                  controls
                  loop
                  muted
                  playsInline
                  poster={post.imageUrl}
                  className="h-full w-full object-cover"
                  aria-label={post.caption ?? `${siteConfig.name} video on Instagram`}
                >
                  <source src={post.videoUrl} />
                </video>
              </div>
            ) : (
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
            ),
          )}
        </div>
      ) : (
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
      )}

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Like what you see?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Book a consultation to discuss your own treatment plan.</p>
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
