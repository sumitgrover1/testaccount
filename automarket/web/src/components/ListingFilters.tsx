'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { formatPrice } from '@/lib/format';

export interface Facets {
  brands: { slug: string; name: string; count: number }[];
  bodyTypes: { value: string; count: number }[];
  fuelTypes: { value: string; count: number }[];
  priceRange: { min: number; max: number };
}

const SORTS = [
  { value: 'popular', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
  { value: 'mileage', label: 'Best mileage' },
];

export function ListingFilters({ facets }: { facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Every filter writes through the URL, so a filtered listing stays
  // shareable, bookmarkable and indexable.
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleCsv = useCallback(
    (key: string, value: string) => {
      const current = (searchParams.get(key) ?? '').split(',').filter(Boolean);
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      setParam(key, next.join(','));
    },
    [searchParams, setParam],
  );

  const activeFuels = (searchParams.get('fuelTypes') ?? '').split(',').filter(Boolean);
  const activeBrand = searchParams.get('brand');
  const activeBody = searchParams.get('bodyType');
  const hasFilters = Boolean(activeBrand || activeBody || activeFuels.length || searchParams.get('maxPrice'));

  return (
    <aside className="card sticky top-24 h-fit p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Filters</h2>
        {hasFilters && (
          <button type="button" onClick={() => router.push(pathname)} className="text-xs font-medium text-brand-600">
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="sort">
          Sort by
        </label>
        <select
          id="sort"
          className="field"
          value={searchParams.get('sort') ?? 'popular'}
          onChange={(event) => setParam('sort', event.target.value)}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label className="label" htmlFor="budget">
          Budget up to {formatPrice(Number(searchParams.get('maxPrice') ?? facets.priceRange.max))}
        </label>
        <input
          id="budget"
          type="range"
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          step={50000}
          value={Number(searchParams.get('maxPrice') ?? facets.priceRange.max)}
          onChange={(event) => setParam('maxPrice', event.target.value)}
          className="w-full accent-brand-600"
        />
      </div>

      {facets.brands.length > 0 && (
        <fieldset className="mt-5">
          <legend className="label">Brand</legend>
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {facets.brands.map((brand) => (
              <label key={brand.slug} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="radio"
                  name="brand"
                  checked={activeBrand === brand.slug}
                  onChange={() => setParam('brand', activeBrand === brand.slug ? null : brand.slug)}
                  className="accent-brand-600"
                />
                <span className="flex-1">{brand.name}</span>
                <span className="text-xs text-slate-400">{brand.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {facets.fuelTypes.length > 0 && (
        <fieldset className="mt-5">
          <legend className="label">Fuel type</legend>
          <div className="flex flex-wrap gap-2">
            {facets.fuelTypes.map((fuel) => (
              <button
                key={fuel.value}
                type="button"
                onClick={() => toggleCsv('fuelTypes', fuel.value)}
                className={`chip border transition ${
                  activeFuels.includes(fuel.value)
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {fuel.value.charAt(0) + fuel.value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {facets.bodyTypes.length > 0 && (
        <fieldset className="mt-5">
          <legend className="label">Body type</legend>
          <div className="flex flex-wrap gap-2">
            {facets.bodyTypes.map((body) => (
              <button
                key={body.value}
                type="button"
                onClick={() => setParam('bodyType', activeBody === body.value ? null : body.value)}
                className={`chip border transition ${
                  activeBody === body.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {body.value}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </aside>
  );
}
