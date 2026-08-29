'use client';

import { useEffect, useMemo, useState } from 'react';
import { clientGet, clientPost } from '@/lib/api';
import { formatPrice, formatRupees } from '@/lib/format';
import { PriceBreakup } from './PriceBreakup';
import type { City, OnRoadQuote, Variant } from '@/lib/types';

interface Teaser {
  exShowroom: number;
  estimatedRange: { from: number; to: number };
  city: { name: string; state: string };
  unlockRequired: boolean;
}

interface Props {
  modelLabel: string;
  variants: Variant[];
  cities: City[];
  initialVariantId?: string;
}

// The marketplace's core exchange: the shopper gets the exact itemised on-road
// price for their variant and city; the business gets a lead that names both.
export function OnRoadPriceWidget({ modelLabel, variants, cities, initialVariantId }: Props) {
  const defaultVariant = useMemo(
    () => variants.find((variant) => variant.id === initialVariantId) ?? variants.find((v) => v.isTopSelling) ?? variants[0],
    [variants, initialVariantId],
  );

  const [variantId, setVariantId] = useState(defaultVariant?.id ?? '');
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [quote, setQuote] = useState<OnRoadQuote | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!variantId || !citySlug) return;
    setQuote(null);
    setTeaser(null);
    clientGet<Teaser>(`/pricing/on-road/teaser?variantId=${variantId}&citySlug=${citySlug}`)
      .then(setTeaser)
      .catch((teaserError: unknown) =>
        setError(teaserError instanceof Error ? teaserError.message : 'Could not load price'),
      );
  }, [variantId, citySlug]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('submitting');
    setError(null);

    try {
      const result = await clientPost<OnRoadQuote>('/pricing/on-road', {
        variantId,
        citySlug,
        contact: {
          fullName: form.get('fullName'),
          phone: form.get('phone'),
          email: form.get('email') || undefined,
          citySlug,
          consentToContact: true,
        },
      });
      setQuote(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong');
    } finally {
      setStatus('idle');
    }
  }

  const selectedVariant = variants.find((variant) => variant.id === variantId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900">Choose your variant and city</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="variant">
                Variant
              </label>
              <select
                id="variant"
                className="field"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} — {formatPrice(variant.exShowroomPrice)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="city">
                City
              </label>
              <select
                id="city"
                className="field"
                value={citySlug}
                onChange={(event) => setCitySlug(event.target.value)}
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.slug}>
                    {city.name}, {city.state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedVariant && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              {modelLabel} {selectedVariant.name} · Ex-showroom{' '}
              <span className="font-semibold text-slate-800">
                {formatRupees(selectedVariant.exShowroomPrice)}
              </span>
            </p>
          )}
        </div>

        {quote ? (
          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-900">
              On-road price in {quote.city.name}
            </h2>
            <PriceBreakup lines={quote.breakup} total={quote.amounts.totalOnRoad} />
            <p className="mt-3 text-xs text-slate-400">
              Road tax and registration follow {quote.city.state} RTO rules. Dealer handling charges are
              negotiable and insurance can be bought from any insurer — compare in the Insurance section.
            </p>
          </section>
        ) : (
          teaser && (
            <section className="card p-6">
              <p className="text-sm text-slate-500">Estimated on-road price in {teaser.city.name}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatPrice(teaser.estimatedRange.from)} – {formatPrice(teaser.estimatedRange.to)}
              </p>
              <div className="mt-4 space-y-2">
                {['Road tax & registration', 'Insurance (1 year)', 'FASTag & handling charges', 'TCS, if applicable'].map(
                  (line) => (
                    <div key={line} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">{line}</span>
                      <span className="select-none text-sm font-semibold text-slate-300 blur-[3px]">
                        ₹ 00,000
                      </span>
                    </div>
                  ),
                )}
              </div>
              <p className="mt-4 text-sm font-medium text-brand-700">
                Fill the form to unlock the exact, itemised breakup →
              </p>
            </section>
          )
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        {quote ? (
          <div className="card border-finance-500/30 bg-finance-50 p-6">
            <p className="text-2xl">✅</p>
            <h3 className="mt-2 font-semibold text-slate-900">Your price is ready</h3>
            <p className="mt-1 text-sm text-slate-600">
              We have shared your enquiry with an authorised {modelLabel.split(' ')[0]} dealer in{' '}
              {quote.city.name}. They will call you with the best available offer.
            </p>
            <a
              href={`/finance?vehiclePrice=${quote.amounts.totalOnRoad}&vehicleType=${quote.model.vehicleType}`}
              className="btn-primary mt-4 w-full"
            >
              Check EMI for {formatPrice(quote.amounts.totalOnRoad)}
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-5">
            <h3 className="font-semibold text-slate-900">Get the exact on-road price</h3>
            <p className="mt-1 text-sm text-slate-500">
              Free, and includes every RTO and dealer charge.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="onroad-name">
                  Your name
                </label>
                <input id="onroad-name" name="fullName" required minLength={2} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="onroad-phone">
                  Mobile number
                </label>
                <input
                  id="onroad-phone"
                  name="phone"
                  required
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="onroad-email">
                  Email (optional)
                </label>
                <input id="onroad-email" name="email" type="email" className="field" />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={status === 'submitting'} className="btn-accent mt-4 w-full">
              {status === 'submitting' ? 'Getting your price…' : 'Show on-road price'}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              An authorised dealer may call you with an offer on this vehicle.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
