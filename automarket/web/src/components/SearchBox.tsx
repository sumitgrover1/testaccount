'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { clientGet, SEGMENT_FOR_TYPE } from '@/lib/api';
import { formatPriceRange } from '@/lib/format';
import type { VehicleType } from '@/lib/types';

interface SearchResult {
  models: {
    id: string;
    slug: string;
    name: string;
    vehicleType: VehicleType;
    priceMin: number;
    priceMax: number;
    brand: { slug: string; name: string };
  }[];
  brands: { id: string; slug: string; name: string; vehicleType: VehicleType }[];
}

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    // Debounced so typing a model name does not fire a request per keystroke.
    const timer = setTimeout(() => {
      clientGet<SearchResult>(`/catalog/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .catch(() => setResults(null));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const hasResults = Boolean(results && (results.models.length > 0 || results.brands.length > 0));

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={compact ? 'Search vehicles' : 'Search for a car, bike, bus or tractor'}
        aria-label="Search vehicles"
        className={compact ? 'field py-2 text-sm' : 'field py-3.5 text-base'}
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {!hasResults && <p className="px-3 py-4 text-sm text-slate-500">No vehicles matched “{query}”.</p>}

          {results?.brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/${SEGMENT_FOR_TYPE[brand.vehicleType]}?brand=${brand.slug}`}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{brand.name}</span>
              <span className="ml-2 text-xs text-slate-400">Brand</span>
            </Link>
          ))}

          {results?.models.map((model) => (
            <Link
              key={model.id}
              href={`/${SEGMENT_FOR_TYPE[model.vehicleType]}/${model.brand.slug}/${model.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">
                {model.brand.name} {model.name}
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {formatPriceRange(model.priceMin, model.priceMax)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
