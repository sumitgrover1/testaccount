'use client';

import { useState } from 'react';
import { clientPost } from '@/lib/api';
import { formatPrice, formatRupees } from '@/lib/format';
import type { City, InsuranceAddOn, PlanQuote, PolicyType, QuoteResponse, VehicleType } from '@/lib/types';

const POLICY_TYPES: { value: PolicyType; label: string; blurb: string }[] = [
  { value: 'COMPREHENSIVE', label: 'Comprehensive', blurb: 'Own damage + third party. Recommended.' },
  { value: 'THIRD_PARTY', label: 'Third party only', blurb: 'The legal minimum. Cheapest.' },
  { value: 'OWN_DAMAGE', label: 'Own damage only', blurb: 'If your third-party cover is still active.' },
];

const NCB_OPTIONS = [0, 20, 25, 35, 45, 50];

interface Props {
  vehicleType: VehicleType;
  cities: City[];
  addOns: InsuranceAddOn[];
}

export function InsuranceQuoteFlow({ vehicleType, cities, addOns }: Props) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    registrationNo: '',
    registrationYear: currentYear - 3,
    vehicleValue: vehicleType === 'BIKE' ? 120000 : vehicleType === 'TRACTOR' ? 750000 : 1000000,
    engineCc: vehicleType === 'BIKE' ? 150 : vehicleType === 'TRACTOR' ? 2500 : 1200,
    policyType: 'COMPREHENSIVE' as PolicyType,
    ncbPercent: 20,
    claimedLastYear: false,
  });
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(['zero-depreciation']);
  const [result, setResult] = useState<QuoteResponse | null>(null);
  const [selected, setSelected] = useState<PlanQuote | null>(null);
  const [status, setStatus] = useState<'idle' | 'quoting' | 'applying' | 'applied'>('idle');
  const [error, setError] = useState<string | null>(null);

  function toggleAddOn(slug: string) {
    setSelectedAddOns((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  const quotePayload = () => ({
    vehicleType,
    policyType: form.policyType,
    vehicleValue: form.vehicleValue,
    engineCc: form.engineCc,
    registrationYear: form.registrationYear,
    registrationNo: form.registrationNo || undefined,
    isNewVehicle: form.registrationYear === currentYear,
    ncbPercent: form.ncbPercent,
    claimedLastYear: form.claimedLastYear,
    addOnSlugs: selectedAddOns,
  });

  async function getQuotes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('quoting');
    setError(null);
    try {
      const data = await clientPost<QuoteResponse>('/insurance/quotes', quotePayload());
      setResult(data);
      setSelected(data.quotes[0] ?? null);
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : 'Could not fetch quotes');
    } finally {
      setStatus('idle');
    }
  }

  async function buy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    setStatus('applying');
    setError(null);
    try {
      await clientPost('/insurance/apply', {
        ...quotePayload(),
        planId: selected.planId,
        contact: {
          fullName: data.get('fullName'),
          phone: data.get('phone'),
          email: data.get('email') || undefined,
          citySlug: data.get('citySlug') || undefined,
          consentToContact: true,
        },
      });
      setStatus('applied');
    } catch (buyError) {
      setStatus('idle');
      setError(buyError instanceof Error ? buyError.message : 'Could not submit your request');
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={getQuotes} className="card p-5">
        <h2 className="font-semibold text-slate-900">Your vehicle</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="ins-reg">
              Registration number (optional)
            </label>
            <input
              id="ins-reg"
              className="field uppercase"
              placeholder="DL01AB1234"
              value={form.registrationNo}
              onChange={(event) => setForm({ ...form, registrationNo: event.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="label" htmlFor="ins-year">
              Registration year
            </label>
            <select
              id="ins-year"
              className="field"
              value={form.registrationYear}
              onChange={(event) => setForm({ ...form, registrationYear: Number(event.target.value) })}
            >
              {Array.from({ length: 16 }, (_, index) => currentYear - index).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ins-value">
              Showroom price (₹)
            </label>
            <input
              id="ins-value"
              type="number"
              min={20000}
              className="field"
              value={form.vehicleValue}
              onChange={(event) => setForm({ ...form, vehicleValue: Number(event.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="ins-cc">
              Engine (cc)
            </label>
            <input
              id="ins-cc"
              type="number"
              min={25}
              className="field"
              value={form.engineCc}
              onChange={(event) => setForm({ ...form, engineCc: Number(event.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="ins-ncb">
              No Claim Bonus
            </label>
            <select
              id="ins-ncb"
              className="field"
              value={form.ncbPercent}
              disabled={form.claimedLastYear}
              onChange={(event) => setForm({ ...form, ncbPercent: Number(event.target.value) })}
            >
              {NCB_OPTIONS.map((ncb) => (
                <option key={ncb} value={ncb}>
                  {ncb}%
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                className="accent-insure-500"
                checked={form.claimedLastYear}
                onChange={(event) => setForm({ ...form, claimedLastYear: event.target.checked })}
              />
              I claimed in the last policy year
            </label>
          </div>
        </div>

        <fieldset className="mt-5 border-t border-slate-100 pt-5">
          <legend className="label">Policy type</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {POLICY_TYPES.map((policy) => (
              <label
                key={policy.value}
                className={`cursor-pointer rounded-lg border p-3 transition ${
                  form.policyType === policy.value
                    ? 'border-insure-500 bg-insure-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="policyType"
                  className="sr-only"
                  checked={form.policyType === policy.value}
                  onChange={() => setForm({ ...form, policyType: policy.value })}
                />
                <p className="text-sm font-semibold text-slate-900">{policy.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{policy.blurb}</p>
              </label>
            ))}
          </div>
        </fieldset>

        {form.policyType !== 'THIRD_PARTY' && (
          <fieldset className="mt-5 border-t border-slate-100 pt-5">
            <legend className="label">Add-on covers</legend>
            <div className="flex flex-wrap gap-2">
              {addOns.map((addOn) => (
                <button
                  key={addOn.slug}
                  type="button"
                  title={addOn.description}
                  onClick={() => toggleAddOn(addOn.slug)}
                  className={`chip border transition ${
                    selectedAddOns.includes(addOn.slug)
                      ? 'border-insure-500 bg-insure-50 text-insure-600'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {addOn.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === 'quoting'}
          className="btn-primary mt-5 bg-insure-500 hover:bg-insure-600"
        >
          {status === 'quoting' ? 'Fetching quotes…' : 'Compare premiums'}
        </button>
      </form>

      {result && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{result.quotes.length} plans for your vehicle</h2>
              <p className="text-sm text-slate-500">
                IDV {formatPrice(result.vehicle.idv)} · {result.vehicle.ageYears} years old ·{' '}
                {result.vehicle.depreciationPercent}% depreciation applied
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {result.quotes.map((quote) => (
                <label
                  key={quote.planId}
                  className={`card block cursor-pointer p-4 transition ${
                    selected?.planId === quote.planId ? 'border-insure-500 ring-2 ring-insure-500/20' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <input
                      type="radio"
                      name="plan"
                      className="accent-insure-500"
                      checked={selected?.planId === quote.planId}
                      onChange={() => setSelected(quote)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{quote.insurer.name}</p>
                      <p className="text-xs text-slate-500">
                        {quote.planName} · {quote.insurer.claimSettlementRatio}% claims settled ·{' '}
                        {quote.insurer.cashlessGarages.toLocaleString('en-IN')} cashless garages
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Premium (incl. GST)</p>
                      <p className="text-xl font-bold text-insure-600">{formatRupees(quote.totalPremium)}</p>
                    </div>
                  </div>

                  <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {quote.keyBenefits.slice(0, 4).map((benefit) => (
                      <li key={benefit} className="chip bg-slate-100 text-slate-600">
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </label>
              ))}
            </div>

            <div className="lg:sticky lg:top-24 lg:h-fit">
              {selected && status !== 'applied' && (
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-900">{selected.insurer.name}</h3>
                  <p className="text-xs text-slate-500">{selected.planName}</p>

                  <table className="mt-4 w-full text-sm">
                    <tbody>
                      {selected.breakup.map((line) => (
                        <tr key={line.key} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 text-slate-500">{line.label}</td>
                          <td
                            className={`py-2 text-right font-medium ${
                              line.amount < 0 ? 'text-finance-600' : 'text-slate-800'
                            }`}
                          >
                            {line.amount < 0
                              ? `− ${formatRupees(Math.abs(line.amount))}`
                              : formatRupees(line.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-insure-50">
                        <td className="py-3 font-bold text-slate-900">Total premium</td>
                        <td className="py-3 text-right text-lg font-bold text-insure-600">
                          {formatRupees(selected.totalPremium)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <form onSubmit={buy} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    <div>
                      <label className="label" htmlFor="ins-name">
                        Name
                      </label>
                      <input id="ins-name" name="fullName" required className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor="ins-phone">
                        Mobile number
                      </label>
                      <input id="ins-phone" name="phone" required inputMode="numeric" className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor="ins-city">
                        City
                      </label>
                      <select id="ins-city" name="citySlug" className="field" defaultValue="">
                        <option value="">Select</option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.slug}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={status === 'applying'}
                      className="btn-primary w-full bg-insure-500 hover:bg-insure-600"
                    >
                      {status === 'applying' ? 'Submitting…' : `Buy at ${formatRupees(selected.totalPremium)}`}
                    </button>
                    <p className="text-center text-xs text-slate-400">
                      An advisor will confirm your details before the policy is issued.
                    </p>
                  </form>
                </div>
              )}

              {status === 'applied' && (
                <div className="card border-insure-500/30 bg-insure-50 p-6 text-center">
                  <p className="text-2xl">✅</p>
                  <h3 className="mt-2 font-semibold text-slate-900">Request received</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Our insurance advisor will call you to verify the vehicle details and issue the policy.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
