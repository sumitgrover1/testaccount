import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { InsuranceQuoteFlow } from '@/components/InsuranceQuoteFlow';
import type { City, InsuranceAddOn, VehicleType } from '@/lib/types';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

const VEHICLE_BY_SLUG: Record<string, { type: VehicleType; title: string; blurb: string }> = {
  car: {
    type: 'CAR',
    title: 'Car insurance',
    blurb: 'Comprehensive, third-party and own-damage cover for private cars, with add-ons like zero depreciation and engine protection.',
  },
  bike: {
    type: 'BIKE',
    title: 'Two-wheeler insurance',
    blurb: 'Cover for bikes and scooters, including third-party liability at IRDAI-regulated rates.',
  },
  bus: {
    type: 'BUS',
    title: 'Commercial vehicle insurance',
    blurb: 'Passenger-carrying vehicle cover for school, staff and intercity buses.',
  },
  tractor: {
    type: 'TRACTOR',
    title: 'Tractor insurance',
    blurb: 'Agricultural vehicle cover, priced for tractors used on farms and for haulage.',
  },
};

interface PageProps {
  params: { vehicle: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const config = VEHICLE_BY_SLUG[params.vehicle];
  if (!config) return {};
  return {
    title: `${config.title} — compare premiums and buy online`,
    description: config.blurb,
  };
}

export default async function InsuranceQuotePage({ params }: PageProps) {
  const config = VEHICLE_BY_SLUG[params.vehicle];
  if (!config) notFound();

  const [addOns, cities] = await Promise.all([
    api.request<InsuranceAddOn[]>(`/insurance/add-ons?vehicleType=${config.type}`, { revalidate: 3600 }),
    api.request<City[]>('/cities?limit=100', { revalidate: 3600 }),
  ]);

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/insurance" className="hover:text-insure-600">
          Insurance
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{config.title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{config.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{config.blurb}</p>
      </header>

      <InsuranceQuoteFlow vehicleType={config.type} cities={cities} addOns={addOns} />
    </div>
  );
}
