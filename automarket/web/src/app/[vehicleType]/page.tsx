import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, VEHICLE_LABELS, VEHICLE_SEGMENTS } from '@/lib/api';
import { ListingFilters, type Facets } from '@/components/ListingFilters';
import { VehicleCard } from '@/components/VehicleCard';
import type { ModelCard } from '@/lib/types';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { vehicleType: string };
  searchParams: Record<string, string | string[] | undefined>;
}

export function generateMetadata({ params }: PageProps): Metadata {
  const type = VEHICLE_SEGMENTS[params.vehicleType];
  if (!type) return {};
  const label = VEHICLE_LABELS[type];
  return {
    title: `${label.plural} in India — prices, variants and on-road price`,
    description: `Compare ${label.plural.toLowerCase()} in India. ${label.tagline}. Filter by budget, brand and fuel type, and get the exact on-road price for your city.`,
  };
}

function buildQuery(
  vehicleType: string,
  searchParams: PageProps['searchParams'],
): string {
  const params = new URLSearchParams({ vehicleType, limit: '12' });
  const passthrough = ['brand', 'q', 'bodyType', 'fuelTypes', 'transmissions', 'minPrice', 'maxPrice', 'minSeating', 'sort', 'page'];
  for (const key of passthrough) {
    const value = searchParams[key];
    if (typeof value === 'string' && value !== '') params.set(key, value);
  }
  return params.toString();
}

export default async function ListingPage({ params, searchParams }: PageProps) {
  const vehicleType = VEHICLE_SEGMENTS[params.vehicleType];
  if (!vehicleType) notFound();

  const label = VEHICLE_LABELS[vehicleType];
  const [listing, facets] = await Promise.all([
    api.requestWithMeta<ModelCard[]>(`/catalog/models?${buildQuery(vehicleType, searchParams)}`, {
      revalidate: 120,
    }),
    api.request<Facets>(`/catalog/filters/${vehicleType}`, { revalidate: 3600 }),
  ]);

  const page = Number(searchParams.page ?? 1);
  const totalPages = listing.meta?.totalPages ?? 1;

  const pageHref = (target: number) => {
    const next = new URLSearchParams(
      Object.entries(searchParams).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value] as [string, string]] : [],
      ),
    );
    next.set('page', String(target));
    return `/${params.vehicleType}?${next.toString()}`;
  };

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{label.plural}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{label.plural} in India</h1>
        <p className="mt-1 text-sm text-slate-500">
          {label.tagline} · {listing.meta?.total ?? 0} models
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ListingFilters facets={facets} />

        <div>
          {listing.data.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-medium text-slate-700">No vehicles match these filters.</p>
              <p className="mt-1 text-sm text-slate-500">Try widening your budget or clearing a filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listing.data.map((model) => (
                <VehicleCard key={model.id} model={model} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="btn-outline">
                  Previous
                </Link>
              )}
              <span className="px-3 text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="btn-outline">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
