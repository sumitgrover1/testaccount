'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import type { Variant } from '@/lib/types';

export function VariantTable({
  variants,
  onRoadHref,
}: {
  variants: Variant[];
  onRoadHref: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="card divide-y divide-slate-100">
      {variants.map((variant) => (
        <div key={variant.id}>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                {variant.name}
                {variant.isTopSelling && (
                  <span className="chip bg-accent-500/10 text-accent-600">Top selling</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[
                  variant.engineCc ? `${variant.engineCc} cc` : null,
                  variant.fuelType.charAt(0) + variant.fuelType.slice(1).toLowerCase(),
                  variant.transmission,
                  variant.mileageKmpl ? `${variant.mileageKmpl} kmpl` : null,
                  variant.rangeKm ? `${variant.rangeKm} km range` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <div className="text-right">
              <p className="font-bold text-slate-900">{formatPrice(variant.exShowroomPrice)}</p>
              <p className="text-xs text-slate-400">Ex-showroom</p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setExpanded(expanded === variant.id ? null : variant.id)}
                className="btn-outline flex-1 py-2 text-xs sm:flex-none"
              >
                {expanded === variant.id ? 'Hide specs' : 'Specs'}
              </button>
              <Link href={`${onRoadHref}?variant=${variant.id}`} className="btn-accent flex-1 py-2 text-xs sm:flex-none">
                On-road price
              </Link>
            </div>
          </div>

          {expanded === variant.id && (
            <div className="grid gap-5 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
              {variant.specs.map((group) => (
                <div key={group.group}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.group}
                  </h4>
                  <dl className="mt-2 space-y-1.5">
                    {group.items.map((item) => (
                      <div key={item.label} className="flex justify-between gap-4 text-sm">
                        <dt className="text-slate-500">{item.label}</dt>
                        <dd className="text-right font-medium text-slate-800">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
