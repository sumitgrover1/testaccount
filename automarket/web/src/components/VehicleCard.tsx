import Link from 'next/link';
import { SEGMENT_FOR_TYPE } from '@/lib/api';
import { formatPriceRange } from '@/lib/format';
import type { ModelCard } from '@/lib/types';

// One spec strip that adapts to the vehicle class: a tractor buyer wants PTO
// horsepower where a car buyer wants mileage.
function specLine(model: ModelCard): string[] {
  switch (model.vehicleType) {
    case 'TRACTOR':
      return [
        model.powerBhp ? `${model.powerBhp} HP` : null,
        model.ptoHp ? `${model.ptoHp} HP PTO` : null,
        model.bodyType,
      ].filter(Boolean) as string[];
    case 'BUS':
      return [
        model.seatingCapacity ? `${model.seatingCapacity} seats` : null,
        model.gvwKg ? `${(model.gvwKg / 1000).toFixed(1)} T GVW` : null,
        model.bodyType,
      ].filter(Boolean) as string[];
    case 'BIKE':
      return [
        model.engineCc ? `${model.engineCc} cc` : null,
        model.mileageKmpl ? `${model.mileageKmpl} kmpl` : null,
        model.rangeKm ? `${model.rangeKm} km range` : null,
        model.bodyType,
      ].filter(Boolean) as string[];
    default:
      return [
        model.mileageKmpl ? `${model.mileageKmpl} kmpl` : null,
        model.rangeKm ? `${model.rangeKm} km range` : null,
        model.seatingCapacity ? `${model.seatingCapacity} seats` : null,
        model.bodyType,
      ].filter(Boolean) as string[];
  }
}

export function VehicleCard({ model }: { model: ModelCard }) {
  const href = `/${SEGMENT_FOR_TYPE[model.vehicleType]}/${model.brand.slug}/${model.slug}`;

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-200">
      <Link href={href} className="block">
        <div className="relative grid h-40 place-items-center bg-gradient-to-br from-slate-100 to-slate-200">
          {model.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.heroImageUrl} alt={`${model.brand.name} ${model.name}`} className="h-full w-full object-cover" />
          ) : (
            <span className="px-4 text-center text-sm font-semibold text-slate-400">
              {model.brand.name} {model.name}
            </span>
          )}
          {model.status === 'UPCOMING' && (
            <span className="chip absolute left-3 top-3 bg-accent-500 text-white">Upcoming</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{model.brand.name}</p>
        <Link href={href} className="mt-0.5 text-base font-semibold text-slate-900 group-hover:text-brand-700">
          {model.name}
        </Link>

        <p className="mt-2 text-lg font-bold text-brand-700">
          {formatPriceRange(model.priceMin, model.priceMax)}
        </p>
        <p className="text-xs text-slate-400">Ex-showroom price</p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {specLine(model).slice(0, 3).map((spec) => (
            <li key={spec} className="chip bg-slate-100 text-slate-600">
              {spec}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <Link href={`${href}/on-road-price`} className="btn-accent flex-1 py-2 text-xs">
            Get on-road price
          </Link>
          {model.rating > 0 && (
            <span className="chip bg-finance-50 text-finance-600">★ {model.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
