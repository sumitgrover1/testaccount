import Link from 'next/link';
import { api, SEGMENT_FOR_TYPE, VEHICLE_LABELS } from '@/lib/api';
import { SearchBox } from '@/components/SearchBox';
import { VehicleCard } from '@/components/VehicleCard';
import type { Brand, ModelCard } from '@/lib/types';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

interface HomeFeed {
  popularCars: ModelCard[];
  popularBikes: ModelCard[];
  upcoming: ModelCard[];
  tractors: ModelCard[];
  buses: ModelCard[];
}

const SEGMENTS = [
  { href: '/new-cars', title: 'New Cars', blurb: 'Hatchbacks, sedans, SUVs & MPVs', icon: '🚗' },
  { href: '/bikes', title: 'Bikes & Scooters', blurb: 'Commuter, sports and electric', icon: '🏍️' },
  { href: '/buses', title: 'Buses', blurb: 'School, staff and intercity', icon: '🚌' },
  { href: '/tractors', title: 'Tractors', blurb: '2WD and 4WD, 20-60 HP', icon: '🚜' },
];

async function getFeed(): Promise<HomeFeed> {
  return api.request<HomeFeed>('/catalog/home-feed', { revalidate: 300 });
}

async function getBrands(): Promise<Brand[]> {
  return api.request<Brand[]>('/catalog/brands?popular=true', { revalidate: 3600 });
}

function Section({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [feed, brands] = await Promise.all([getFeed(), getBrands()]);

  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 py-14 text-white">
        <div className="container-page">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            Find your next vehicle — and the exact price you will pay for it
          </h1>
          <p className="mt-3 max-w-2xl text-brand-100">
            Research new cars, bikes, buses and tractors. Get a city-wise on-road price breakup,
            compare loan offers from banks and NBFCs, and buy motor insurance in one place.
          </p>

          <div className="mt-7 max-w-2xl">
            <SearchBox />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENTS.map((segment) => (
              <Link
                key={segment.href}
                href={segment.href}
                className="rounded-xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/20"
              >
                <span className="text-2xl">{segment.icon}</span>
                <p className="mt-2 font-semibold">{segment.title}</p>
                <p className="text-xs text-brand-100">{segment.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* The two verticals, presented as their own destinations. */}
      <section className="container-page -mt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/finance" className="card flex items-center gap-4 p-5 transition hover:border-finance-500">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-finance-50 text-2xl">💰</span>
            <div>
              <h2 className="font-semibold text-slate-900">AutoMarket Finance</h2>
              <p className="text-sm text-slate-500">
                Vehicle loans from 8.6% p.a. — check your EMI, eligibility and compare lender offers.
              </p>
            </div>
          </Link>
          <Link href="/insurance" className="card flex items-center gap-4 p-5 transition hover:border-insure-500">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-insure-50 text-2xl">🛡️</span>
            <div>
              <h2 className="font-semibold text-slate-900">AutoMarket Insurance</h2>
              <p className="text-sm text-slate-500">
                Compare motor insurance from 5 insurers, add covers like zero-dep, and renew in minutes.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <Section title="Popular new cars" subtitle="Most researched cars this month" href="/new-cars">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {feed.popularCars.slice(0, 4).map((model) => (
            <VehicleCard key={model.id} model={model} />
          ))}
        </div>
      </Section>

      <section className="border-y border-slate-200 bg-white py-10">
        <div className="container-page">
          <h2 className="mb-5 text-xl font-bold text-slate-900">Browse by brand</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/${SEGMENT_FOR_TYPE[brand.vehicleType]}?brand=${brand.slug}`}
                className="rounded-lg border border-slate-200 px-3 py-4 text-center transition hover:border-brand-400 hover:bg-brand-50"
              >
                <p className="text-sm font-semibold text-slate-800">{brand.name}</p>
                <p className="text-xs text-slate-400">
                  {brand._count?.models ?? 0} {VEHICLE_LABELS[brand.vehicleType].singular.toLowerCase()}
                  {(brand._count?.models ?? 0) === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Section title="Popular bikes & scooters" href="/bikes">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {feed.popularBikes.slice(0, 4).map((model) => (
            <VehicleCard key={model.id} model={model} />
          ))}
        </div>
      </Section>

      <Section title="Tractors" subtitle="Built for every farm size" href="/tractors">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {feed.tractors.slice(0, 4).map((model) => (
            <VehicleCard key={model.id} model={model} />
          ))}
        </div>
      </Section>

      <Section title="Buses & passenger vehicles" subtitle="School, staff and intercity" href="/buses">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {feed.buses.slice(0, 4).map((model) => (
            <VehicleCard key={model.id} model={model} />
          ))}
        </div>
      </Section>

      {feed.upcoming.length > 0 && (
        <Section title="Upcoming launches" subtitle="Vehicles arriving soon">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {feed.upcoming.slice(0, 4).map((model) => (
              <VehicleCard key={model.id} model={model} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
