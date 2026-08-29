import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Motor insurance — compare car, bike, bus and tractor policies',
  description:
    'Compare motor insurance premiums from leading insurers. Check IDV, add zero-depreciation and engine protection covers, and renew or buy a policy online.',
};

interface Insurer {
  id: string;
  slug: string;
  name: string;
  claimSettlementRatio: number;
  cashlessGarages: number;
  about: string | null;
  plans: { id: string; name: string; policyType: string; vehicleType: string }[];
}

const PRODUCTS = [
  { href: '/insurance/car', title: 'Car insurance', blurb: 'Comprehensive, third-party and own-damage cover', icon: '🚗' },
  { href: '/insurance/bike', title: 'Two-wheeler insurance', blurb: 'Bikes and scooters, from ₹714 a year', icon: '🏍️' },
  { href: '/insurance/bus', title: 'Commercial vehicle', blurb: 'School, staff and passenger buses', icon: '🚌' },
  { href: '/insurance/tractor', title: 'Tractor insurance', blurb: 'Agricultural vehicles and implements', icon: '🚜' },
];

const FAQS = [
  {
    q: 'What is IDV and why does it matter?',
    a: 'Insured Declared Value is the maximum your insurer pays if the vehicle is stolen or written off. We derive it from the showroom price less depreciation for the vehicle’s age — a higher IDV means a higher premium but a bigger payout.',
  },
  {
    q: 'What does No Claim Bonus do to my premium?',
    a: 'Every claim-free year earns a discount on the own-damage part of your premium, rising from 20% to 50% over five years. Making a claim resets it to zero unless you have NCB protection.',
  },
  {
    q: 'Is third-party insurance enough?',
    a: 'It is the legal minimum and covers injury or damage you cause to others, but it pays nothing towards your own vehicle. For anything under ten years old, comprehensive cover is usually worth the difference.',
  },
  {
    q: 'Which add-ons are actually worth buying?',
    a: 'Zero depreciation is worth it for the first five years, since it stops the insurer deducting depreciation on replaced parts. Engine protection matters in flood-prone cities, and roadside assistance for long-distance drivers.',
  },
];

export default async function InsuranceLandingPage() {
  const insurers = await api
    .request<Insurer[]>('/insurance/insurers', { revalidate: 3600 })
    .catch(() => [] as Insurer[]);

  return (
    <>
      <section className="bg-gradient-to-br from-insure-600 via-insure-500 to-indigo-400 py-12 text-white">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">
            AutoMarket Insurance
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            Compare motor insurance from {insurers.length || 5} insurers in under two minutes
          </h1>
          <p className="mt-3 max-w-2xl text-indigo-50">
            One set of vehicle details, every insurer&apos;s premium side by side — with the full breakup
            of own-damage, third-party, add-ons, NCB discount and GST.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((product) => (
              <Link
                key={product.href}
                href={product.href}
                className="rounded-xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/20"
              >
                <span className="text-2xl">{product.icon}</span>
                <p className="mt-2 font-semibold">{product.title}</p>
                <p className="text-xs text-indigo-50">{product.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Insurers on AutoMarket</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insurers.map((insurer) => (
              <div key={insurer.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">{insurer.name}</p>
                  <span className="chip bg-insure-50 text-insure-600">
                    {insurer.claimSettlementRatio}% claims
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {insurer.cashlessGarages.toLocaleString('en-IN')} cashless garages ·{' '}
                  {insurer.plans.length} plans
                </p>
                {insurer.about && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{insurer.about}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Before you buy</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.q} className="card p-5">
                <h3 className="font-semibold text-slate-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
