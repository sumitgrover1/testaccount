import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { faqPageSchema } from '@/lib/structuredData';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: `Common questions about consultations, sessions, safety, and pricing at ${siteConfig.name}.`,
};

const faqs = [
  {
    question: 'Do I need an appointment, or can I walk in?',
    answer:
      'We recommend booking ahead so a doctor can be available for your consultation, but do call us and we will try to accommodate walk-ins where possible.',
  },
  {
    question: 'Are your treatments doctor-supervised?',
    answer:
      'Yes — every treatment plan is assessed and overseen by our in-house doctors, and adjusted based on how your skin or hair responds over your sessions.',
  },
  {
    question: 'How much will my treatment cost?',
    answer:
      'Pricing depends on your specific skin/hair condition and goals, so we don’t publish a fixed price list. Book a consultation and we’ll give you a clear, itemized plan before you commit to anything.',
  },
  {
    question: 'How many sessions will I need?',
    answer:
      'This varies by treatment and by individual — your doctor will recommend a session count during your consultation and track your progress after each visit.',
  },
  {
    question: 'Is there any downtime after a treatment?',
    answer:
      'Downtime depends on the specific treatment. Your doctor will walk you through exactly what to expect and any aftercare before you begin.',
  },
  {
    question: 'What safety and hygiene protocols do you follow?',
    answer:
      'We follow standard clinical hygiene protocols — sterilized equipment, single-use disposables where applicable, and a doctor-led assessment before any treatment begins.',
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <JsonLd data={faqPageSchema(faqs)} />
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">FAQ</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Frequently Asked Questions</h1>

      <div className="mt-12 divide-y divide-brand-100">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-lg text-charcoal-900">
              {faq.question}
              <span className="ml-4 shrink-0 text-brand-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-charcoal-700">{faq.answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Still have questions?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Our team is happy to answer anything before you book.</p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-brand-600 px-7 py-3 text-sm font-medium text-white hover:bg-brand-700"
        >
          Ask Us / Book a Consultation
        </Link>
      </div>
    </div>
  );
}
