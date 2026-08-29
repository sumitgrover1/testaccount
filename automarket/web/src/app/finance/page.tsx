import type { Metadata } from 'next';
import { api, VEHICLE_LABELS } from '@/lib/api';
import { FinanceApplication } from '@/components/FinanceApplication';
import type { City, LoanOffer, VehicleType } from '@/lib/types';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vehicle loans — EMI calculator, eligibility and lender offers',
  description:
    'Compare car, bike, bus and tractor loan offers from banks and NBFCs. Calculate your EMI, check eligibility against your income and apply online.',
};

interface PageProps {
  searchParams: { vehiclePrice?: string; vehicleType?: string };
}

const BENEFITS = [
  { title: 'Rates from 8.6% p.a.', body: 'Compare live rates across banks, NBFCs and captive financiers in one place.' },
  { title: 'Up to 100% funding', body: 'Selected lenders fund the entire ex-showroom price for eligible profiles.' },
  { title: 'Approval in 24 hours', body: 'Digital sanction for salaried applicants with a clean credit history.' },
  { title: 'Tenure up to 84 months', body: 'Stretch the tenure to bring the EMI within your monthly budget.' },
];

export default async function FinancePage({ searchParams }: PageProps) {
  const vehicleType = (searchParams.vehicleType as VehicleType) ?? 'CAR';
  const defaultPrice = Number(searchParams.vehiclePrice ?? 1000000);

  const [offers, cities] = await Promise.all([
    api.request<LoanOffer[]>('/finance/offers', { revalidate: 1800 }),
    api.request<City[]>('/cities?limit=100', { revalidate: 3600 }),
  ]);

  const featured = offers.filter((offer) => offer.isFeatured).slice(0, 4);
  const bestRate = offers.reduce((min, offer) => Math.min(min, offer.interestRateMin), 99);

  return (
    <>
      <section className="bg-gradient-to-br from-finance-600 via-finance-500 to-emerald-400 py-12 text-white">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">
            AutoMarket Finance
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            Vehicle loans from {bestRate}% p.a., compared across every lender
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-50">
            Work out the EMI you can afford, see which lenders will actually approve you, and apply to
            the one with the lowest cost — for cars, bikes, buses and tractors.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="font-semibold">{benefit.title}</p>
                <p className="mt-1 text-xs text-emerald-50">{benefit.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <FinanceApplication cities={cities} defaultPrice={defaultPrice} defaultVehicleType={vehicleType} />

        <section className="mt-12">
          <h2 className="mb-3 text-xl font-bold text-slate-900">Featured lender offers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((offer) => (
              <div key={offer.id} className="card p-5">
                <p className="font-semibold text-slate-900">{offer.lender.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {offer.lender.type} · {VEHICLE_LABELS[offer.vehicleType].singular} loan
                </p>
                <p className="mt-3 text-2xl font-bold text-finance-600">{offer.interestRateMin}%</p>
                <p className="text-xs text-slate-400">starting interest, p.a.</p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Max tenure</dt>
                    <dd className="font-medium text-slate-800">{offer.maxTenureMonths} months</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Funding</dt>
                    <dd className="font-medium text-slate-800">up to {offer.maxLtvPercent}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Approval</dt>
                    <dd className="font-medium text-slate-800">{offer.approvalHours} hrs</dd>
                  </div>
                </dl>
                {offer.lender.about && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
                    {offer.lender.about}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-3 text-xl font-bold text-slate-900">How vehicle loan eligibility works</h2>
          <div className="card grid gap-6 p-6 sm:grid-cols-3">
            <div>
              <h3 className="font-semibold text-slate-900">Your EMI budget</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Lenders cap total EMIs at roughly half your monthly income. Existing loans eat into that
                budget, which is why we ask for them before quoting an amount.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Loan-to-value cap</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Most lenders fund 80-90% of the vehicle price; a few fund 100% for strong profiles. The
                rest is your down payment.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Credit score</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                A score above 750 gets you the lower end of a lender&apos;s advertised band. Below 700,
                fewer lenders will approve, and the rate rises.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
