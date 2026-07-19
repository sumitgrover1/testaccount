import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { EnquiryForm } from '@/components/EnquiryForm';

export const metadata: Metadata = { title: `Contact — ${siteConfig.name}` };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-blush-600">Contact</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Book an Appointment</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        Share your details and our team will call you back to schedule a consultation.
      </p>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <EnquiryForm />

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
