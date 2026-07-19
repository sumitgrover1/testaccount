import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${siteConfig.name}'s doctor-led approach to skin and hair care in ${siteConfig.city}.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">About Us</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">{siteConfig.name}</h1>
      <p className="mt-6 text-charcoal-700">
        {siteConfig.description} We combine clinical expertise with a calm, welcoming environment —
        every plan starts with a real consultation, not a fixed menu.
      </p>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl bg-cream-100 p-8">
          <h2 className="font-serif text-xl text-brand-700">Our Approach</h2>
          <p className="mt-3 text-sm text-charcoal-700">
            Every patient is assessed by a doctor before any treatment begins. Plans are tailored to
            your skin, hair, and goals, and progress is tracked session by session.
          </p>
        </div>
        <div className="rounded-2xl bg-cream-100 p-8">
          <h2 className="font-serif text-xl text-brand-700">Our Space</h2>
          <p className="mt-3 text-sm text-charcoal-700">
            Located at {siteConfig.address.line1}, {siteConfig.address.line2} — a private, comfortable
            clinic designed around your care.
          </p>
        </div>
      </div>

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Ready to get started?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Book a consultation and meet our team in person.</p>
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
