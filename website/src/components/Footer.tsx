import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-blush-100 bg-cream-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="font-serif text-lg text-blush-700">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-charcoal-700">{siteConfig.tagline}</p>
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block text-sm font-medium text-blush-600 hover:text-blush-700"
          >
            {siteConfig.instagramHandle} on Instagram
          </a>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-charcoal-800">Visit us</p>
          <a
            href={siteConfig.address.mapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 block text-sm text-charcoal-700 hover:text-blush-600"
          >
            {siteConfig.address.line1}
            <br />
            {siteConfig.address.line2}
          </a>
          <div className="mt-4 text-sm text-charcoal-700">
            {siteConfig.hours.map((h) => (
              <p key={h.days}>
                {h.days}: {h.time}
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-charcoal-800">Contact</p>
          <a href={`tel:${siteConfig.phone}`} className="mt-2 block text-sm text-charcoal-700 hover:text-blush-600">
            {siteConfig.phoneDisplay}
          </a>
          <a href={`mailto:${siteConfig.email}`} className="mt-1 block text-sm text-charcoal-700 hover:text-blush-600">
            {siteConfig.email}
          </a>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded-full bg-blush-600 px-5 py-2 text-sm font-medium text-white hover:bg-blush-700"
          >
            Book Appointment
          </Link>
        </div>
      </div>
      <div className="border-t border-blush-100 py-4 text-center text-xs text-charcoal-700">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}
