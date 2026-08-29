'use client';

import { Fragment, useEffect, useState } from 'react';
import { clientGet } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { ModelDetail, Variant, VehicleType } from '@/lib/types';

interface SearchHit {
  id: string;
  slug: string;
  name: string;
  vehicleType: VehicleType;
  brand: { slug: string; name: string };
}

interface CompareColumn {
  id: string;
  name: string;
  exShowroomPrice: number;
  fuelType: string;
  transmission: string | null;
  model: {
    id: string;
    name: string;
    vehicleType: VehicleType;
    heroImageUrl: string | null;
    rating: number;
    brand: { slug: string; name: string };
  };
}

interface CompareResult {
  variants: CompareColumn[];
  specRows: { group: string; label: string; values: Record<string, string> }[];
}

interface Picked {
  variantId: string;
  label: string;
  variants: Variant[];
}

const MAX_COLUMNS = 4;

export function CompareTool() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      clientGet<{ models: SearchHit[] }>(`/catalog/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => setHits(data.models))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // The comparison always reflects the current selection, so changing a variant
  // in any column re-fetches rather than leaving a stale table on screen.
  useEffect(() => {
    if (picked.length < 2) {
      setResult(null);
      return;
    }
    const ids = picked.map((item) => item.variantId).join(',');
    clientGet<CompareResult>(`/catalog/compare?variantIds=${ids}`)
      .then(setResult)
      .catch((compareError: unknown) =>
        setError(compareError instanceof Error ? compareError.message : 'Could not compare these variants'),
      );
  }, [picked]);

  async function addModel(hit: SearchHit) {
    if (picked.length >= MAX_COLUMNS) return;
    setQuery('');
    setHits([]);
    setError(null);
    try {
      const model = await clientGet<ModelDetail>(`/catalog/models/${hit.brand.slug}/${hit.slug}`);
      const preferred = model.variants.find((variant) => variant.isTopSelling) ?? model.variants[0];
      if (!preferred) return;
      setPicked((current) => [
        ...current,
        { variantId: preferred.id, label: `${model.brand.name} ${model.name}`, variants: model.variants },
      ]);
    } catch {
      setError('Could not load that model');
    }
  }

  function changeVariant(index: number, variantId: string) {
    setPicked((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, variantId } : item)),
    );
  }

  function remove(index: number) {
    setPicked((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  const groups = [...new Set(result?.specRows.map((row) => row.group) ?? [])];

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <label className="label" htmlFor="compare-search">
          Add a vehicle ({picked.length}/{MAX_COLUMNS})
        </label>
        <input
          id="compare-search"
          className="field"
          value={query}
          disabled={picked.length >= MAX_COLUMNS}
          placeholder="Search a car, bike, bus or tractor"
          onChange={(event) => setQuery(event.target.value)}
        />

        {hits.length > 0 && (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => addModel(hit)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {hit.brand.name} {hit.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {picked.map((item, index) => (
              <div key={`${item.variantId}-${index}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${item.label}`}
                    className="text-slate-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
                <select
                  className="field mt-2 py-1.5 text-xs"
                  value={item.variantId}
                  onChange={(event) => changeVariant(index, event.target.value)}
                >
                  {item.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {picked.length === 1 && (
          <p className="mt-3 text-sm text-slate-500">Add one more vehicle to start comparing.</p>
        )}
      </div>

      {result && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Specification
                </th>
                {result.variants.map((variant) => (
                  <th key={variant.id} className="px-4 py-3 text-left">
                    <p className="font-semibold text-slate-900">
                      {variant.model.brand.name} {variant.model.name}
                    </p>
                    <p className="text-xs font-normal text-slate-500">{variant.name}</p>
                    <p className="mt-1 font-bold text-brand-700">{formatPrice(variant.exShowroomPrice)}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr className="bg-slate-50">
                    <td
                      colSpan={result.variants.length + 1}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {group}
                    </td>
                  </tr>
                  {result.specRows
                    .filter((row) => row.group === group)
                    .map((row) => (
                      <tr key={`${group}-${row.label}`} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 text-slate-500">{row.label}</td>
                        {result.variants.map((variant) => (
                          <td key={variant.id} className="px-4 py-2.5 font-medium text-slate-800">
                            {row.values[variant.id]}
                          </td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
