import type { Metadata } from 'next';
import { Suspense } from 'react';
import { siteConfig, buildWhatsAppUrl } from '@/config/site';
import { EnquiryForm } from '@/components/EnquiryForm';

export const metadata: Metadata = {
  title: 'Contact & Book an Appointment',
  description: `Book a skin or hair consultation at ${siteConfig.name} in ${siteConfig.city} — call, WhatsApp, or request a callback online.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-blush-600">Contact</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Book an Appointment</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        Share your details and our team will call you back to schedule a consultation — or reach us
        directly below.
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href={buildWhatsAppUrl("Hi, I'd like to book a consultation at Lumine Aesthetics.")}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full bg-[#25D366] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          Chat on WhatsApp
        </a>
        <a
          href={`tel:${siteConfig.phone}`}
          className="rounded-full border border-blush-300 px-6 py-3 text-sm font-medium text-blush-700 transition hover:bg-blush-50"
        >
          Call {siteConfig.phoneDisplay}
        </a>
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <Suspense fallback={null}>
          <EnquiryForm />
        </Suspense>

        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-lg text-blush-700">Visit</h2>
            <a
              href={siteConfig.address.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block text-sm text-charcoal-700 hover:text-blush-600"
            >
              {siteConfig.address.line1}
              <br />
              {siteConfig.address.line2}
            </a>
            <div className="mt-4 overflow-hidden rounded-2xl border border-blush-100">
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
            <h2 className="font-serif text-lg text-blush-700">Call or Message</h2>
            <a href={`tel:${siteConfig.phone}`} className="mt-1 block text-sm text-charcoal-700 hover:text-blush-600">
              {siteConfig.phoneDisplay}
            </a>
            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-1 block text-sm text-charcoal-700 hover:text-blush-600"
            >
              {siteConfig.email}
            </a>
          </div>
          <div>
            <h2 className="font-serif text-lg text-blush-700">Hours</h2>
            {siteConfig.hours.map((h) => (
              <p key={h.days} className="mt-1 text-sm text-charcoal-700">
                {h.days}: {h.time}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
