import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, SEGMENT_FOR_TYPE, VEHICLE_SEGMENTS } from '@/lib/api';
import { OnRoadPriceWidget } from '@/components/OnRoadPriceWidget';
import { formatPrice } from '@/lib/format';
import type { City, ModelDetail } from '@/lib/types';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { vehicleType: string; brand: string; model: string };
  searchParams: { variant?: string };
}

async function getModel(brand: string, model: string): Promise<ModelDetail | null> {
  try {
    return await api.request<ModelDetail>(`/catalog/models/${brand}/${model}`, { revalidate: 300 });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const model = await getModel(params.brand, params.model);
  if (!model) return {};
  return {
    title: `${model.brand.name} ${model.name} on-road price in your city`,
    description: `Exact on-road price of the ${model.brand.name} ${model.name} — ex-showroom ${formatPrice(model.priceMin)} plus RTO, road tax, insurance, FASTag and handling charges, city by city.`,
  };
}

export default async function OnRoadPricePage({ params, searchParams }: PageProps) {
  const vehicleType = VEHICLE_SEGMENTS[params.vehicleType];
  if (!vehicleType) notFound();

  const model = await getModel(params.brand, params.model);
  if (!model) notFound();

  const cities = await api.request<City[]>('/cities?limit=100', { revalidate: 3600 });
  const basePath = `/${SEGMENT_FOR_TYPE[model.vehicleType]}/${model.brand.slug}/${model.slug}`;

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-xs text-slate-400">
        <Link href={basePath} className="hover:text-brand-600">
          {model.brand.name} {model.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">On-road price</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {model.brand.name} {model.name} on-road price
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ex-showroom price is only part of what you pay. Pick your variant and city to see road tax,
          registration, insurance, FASTag, handling charges and TCS, itemised.
        </p>
      </header>

      <OnRoadPriceWidget
        modelLabel={`${model.brand.name} ${model.name}`}
        variants={model.variants}
        cities={cities}
        initialVariantId={searchParams.variant}
      />
    </div>
  );
}
