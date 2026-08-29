import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, SEGMENT_FOR_TYPE, VEHICLE_LABELS, VEHICLE_SEGMENTS } from '@/lib/api';
import { LeadForm } from '@/components/LeadForm';
import { VariantTable } from '@/components/VariantTable';
import { VehicleCard } from '@/components/VehicleCard';
import { formatPrice, formatPriceRange } from '@/lib/format';
import type { City, ModelCard, ModelDetail } from '@/lib/types';

// Rendered per request: catalogue prices, offers and premiums change often
// enough that a stale prerender would quote the wrong number.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { vehicleType: string; brand: string; model: string };
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
    title: model.metaTitle ?? `${model.brand.name} ${model.name} price, variants & specifications`,
    description:
      model.metaDescription ??
      `${model.brand.name} ${model.name} price starts at ${formatPrice(model.priceMin)}. Check variants, specifications, mileage and the on-road price in your city.`,
  };
}

export default async function ModelPage({ params }: PageProps) {
  const vehicleType = VEHICLE_SEGMENTS[params.vehicleType];
  if (!vehicleType) notFound();

  const model = await getModel(params.brand, params.model);
  if (!model || model.vehicleType !== vehicleType) notFound();

  const [similar, cities] = await Promise.all([
    api.request<ModelCard[]>(`/catalog/models/${model.id}/similar`, { revalidate: 600 }).catch(() => []),
    api.request<City[]>('/cities?popular=true&limit=20', { revalidate: 3600 }).catch(() => []),
  ]);

  const basePath = `/${SEGMENT_FOR_TYPE[model.vehicleType]}/${model.brand.slug}/${model.slug}`;
  const label = VEHICLE_LABELS[model.vehicleType];

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/${params.vehicleType}`} className="hover:text-brand-600">
          {label.plural}
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/${params.vehicleType}?brand=${model.brand.slug}`} className="hover:text-brand-600">
          {model.brand.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{model.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section className="card overflow-hidden">
            <div className="grid h-56 place-items-center bg-gradient-to-br from-slate-100 to-slate-200 sm:h-72">
              {model.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={model.heroImageUrl} alt={`${model.brand.name} ${model.name}`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-slate-400">
                  {model.brand.name} {model.name}
                </span>
              )}
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {model.brand.name} {model.name}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {[model.bodyType, model.segment, `${model.variants.length} variants`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {model.rating > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">★ {model.rating.toFixed(1)}</p>
                    <p className="text-xs text-slate-400">{model.reviewCount} ratings</p>
                  </div>
                )}
              </div>

              <p className="mt-4 text-2xl font-bold text-brand-700">
                {formatPriceRange(model.priceMin, model.priceMax)}
              </p>
              <p className="text-xs text-slate-400">Ex-showroom price, Delhi</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`${basePath}/on-road-price`} className="btn-accent">
                  Get on-road price
                </Link>
                <Link href={`/finance?vehiclePrice=${model.priceMin}&vehicleType=${model.vehicleType}`} className="btn-outline">
                  Check EMI
                </Link>
                <Link href={`/insurance/${model.vehicleType.toLowerCase()}`} className="btn-outline">
                  Insure this vehicle
                </Link>
              </div>

              {model.description && (
                <p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-relaxed text-slate-600">
                  {model.description}
                </p>
              )}
            </div>
          </section>

          {model.highlights.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Key highlights</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {model.highlights.map((highlight) => (
                  <div key={highlight.id} className="card p-4">
                    <p className="text-xs text-slate-400">{highlight.label}</p>
                    <p className="mt-1 font-semibold text-slate-900">{highlight.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="variants">
            <h2 className="mb-3 text-lg font-bold text-slate-900">
              {model.brand.name} {model.name} variants & prices
            </h2>
            <VariantTable variants={model.variants} onRoadHref={`${basePath}/on-road-price`} />
          </section>

          {similar.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Similar vehicles to consider</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {similar.slice(0, 3).map((item) => (
                  <VehicleCard key={item.id} model={item} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <LeadForm
            type="TEST_DRIVE"
            vehicleType={model.vehicleType}
            modelId={model.id}
            cities={cities}
            title="Book a free test drive"
            description={`Try the ${model.name} at a dealership near you.`}
            submitLabel="Book test drive"
          />
          <LeadForm
            type="CALLBACK"
            vehicleType={model.vehicleType}
            modelId={model.id}
            cities={cities}
            title="Request a callback"
            description="Get the best available offer from an authorised dealer."
            submitLabel="Request callback"
          />
        </div>
      </div>
    </div>
  );
}
