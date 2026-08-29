'use client';

import { useCallback, useState } from 'react';
import { clientPost } from '@/lib/api';
import { formatPrice, formatRupees } from '@/lib/format';
import { EmiCalculator } from './EmiCalculator';
import type { City, EligibilityResult, EmploymentType, OfferEligibility, VehicleType } from '@/lib/types';

const EMPLOYMENT: { value: EmploymentType; label: string }[] = [
  { value: 'SALARIED', label: 'Salaried' },
  { value: 'SELF_EMPLOYED', label: 'Self-employed professional' },
  { value: 'BUSINESS', label: 'Business owner' },
  { value: 'FARMER', label: 'Farmer' },
  { value: 'FLEET_OPERATOR', label: 'Fleet operator' },
];

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Bike / scooter' },
  { value: 'BUS', label: 'Bus' },
  { value: 'TRACTOR', label: 'Tractor' },
];

interface Props {
  cities: City[];
  defaultPrice: number;
  defaultVehicleType: VehicleType;
}

export function FinanceApplication({ cities, defaultPrice, defaultVehicleType }: Props) {
  const [loan, setLoan] = useState({
    vehiclePrice: defaultPrice,
    downPayment: Math.round(defaultPrice * 0.2),
    tenureMonths: 60,
    interestRate: 9.5,
  });
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [selected, setSelected] = useState<OfferEligibility | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'applying' | 'applied'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    monthlyIncome: 60000,
    existingEmi: 0,
    employmentType: 'SALARIED' as EmploymentType,
    age: 32,
    creditScore: 750,
  });

  const onCalculatorChange = useCallback(
    (state: { vehiclePrice: number; downPayment: number; tenureMonths: number; interestRate: number }) =>
      setLoan(state),
    [],
  );

  async function checkEligibility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('checking');
    setError(null);
    try {
      const data = await clientPost<EligibilityResult>('/finance/eligibility', {
        vehicleType,
        vehiclePrice: loan.vehiclePrice,
        downPayment: loan.downPayment,
        tenureMonths: loan.tenureMonths,
        ...profile,
      });
      setResult(data);
      setSelected(data.offers.find((offer) => offer.eligible) ?? null);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Could not check eligibility');
    } finally {
      setStatus('idle');
    }
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setStatus('applying');
    setError(null);

    try {
      await clientPost('/finance/apply', {
        vehicleType,
        vehiclePrice: loan.vehiclePrice,
        downPayment: loan.downPayment,
        tenureMonths: loan.tenureMonths,
        ...profile,
        offerId: selected.offerId,
        contact: {
          fullName: form.get('fullName'),
          phone: form.get('phone'),
          email: form.get('email') || undefined,
          citySlug: form.get('citySlug') || undefined,
          consentToContact: true,
        },
      });
      setStatus('applied');
    } catch (applyError) {
      setStatus('idle');
      setError(applyError instanceof Error ? applyError.message : 'Could not submit your application');
    }
  }

  return (
    <div className="space-y-8">
      <section id="emi-calculator">
        <h2 className="mb-3 text-xl font-bold text-slate-900">EMI calculator</h2>
        <EmiCalculator defaultPrice={defaultPrice} onChange={onCalculatorChange} />
      </section>

      <section id="eligibility">
        <h2 className="mb-3 text-xl font-bold text-slate-900">Check your eligibility</h2>
        <form onSubmit={checkEligibility} className="card p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="fin-type">
                Vehicle type
              </label>
              <select
                id="fin-type"
                className="field"
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value as VehicleType)}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fin-employment">
                Employment
              </label>
              <select
                id="fin-employment"
                className="field"
                value={profile.employmentType}
                onChange={(event) =>
                  setProfile({ ...profile, employmentType: event.target.value as EmploymentType })
                }
              >
                {EMPLOYMENT.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fin-income">
                Monthly income (₹)
              </label>
              <input
                id="fin-income"
                type="number"
                min={1000}
                className="field"
                value={profile.monthlyIncome}
                onChange={(event) => setProfile({ ...profile, monthlyIncome: Number(event.target.value) })}
              />
            </div>
            <div>
              <label className="label" htmlFor="fin-emi">
                Existing EMIs (₹)
              </label>
              <input
                id="fin-emi"
                type="number"
                min={0}
                className="field"
                value={profile.existingEmi}
                onChange={(event) => setProfile({ ...profile, existingEmi: Number(event.target.value) })}
              />
            </div>
            <div>
              <label className="label" htmlFor="fin-age">
                Age
              </label>
              <input
                id="fin-age"
                type="number"
                min={18}
                max={80}
                className="field"
                value={profile.age}
                onChange={(event) => setProfile({ ...profile, age: Number(event.target.value) })}
              />
            </div>
            <div>
              <label className="label" htmlFor="fin-score">
                Credit score
              </label>
              <input
                id="fin-score"
                type="number"
                min={300}
                max={900}
                className="field"
                value={profile.creditScore}
                onChange={(event) => setProfile({ ...profile, creditScore: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={status === 'checking'} className="btn-primary bg-finance-500 hover:bg-finance-600">
              {status === 'checking' ? 'Checking…' : 'Check eligibility'}
            </button>
            <p className="text-sm text-slate-500">
              Loan of {formatPrice(loan.vehiclePrice - loan.downPayment)} over {loan.tenureMonths} months
            </p>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      </section>

      {result && (
        <section id="offers">
          <h2 className="mb-1 text-xl font-bold text-slate-900">
            {result.summary.eligibleOffers} of {result.offers.length} lenders can fund this
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Based on a maximum EMI budget of {formatRupees(result.summary.maxEmiBudget)} —{' '}
            {result.summary.foirPercent}% of your income, less existing EMIs.
          </p>

          <div className="space-y-3">
            {result.offers.map((offer) => (
              <label
                key={offer.offerId}
                className={`card flex cursor-pointer flex-wrap items-center gap-4 p-4 transition ${
                  selected?.offerId === offer.offerId ? 'border-finance-500 ring-2 ring-finance-500/20' : ''
                } ${offer.eligible ? '' : 'opacity-60'}`}
              >
                <input
                  type="radio"
                  name="offer"
                  className="accent-finance-500"
                  disabled={!offer.eligible}
                  checked={selected?.offerId === offer.offerId}
                  onChange={() => setSelected(offer)}
                />

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{offer.lender.name}</p>
                  <p className="text-xs text-slate-500">
                    {offer.lender.type} · approval in {offer.approvalHours} hrs · up to {offer.maxLtvPercent}% funding
                  </p>
                  {!offer.eligible && (
                    <p className="mt-1 text-xs text-red-500">{offer.reasons[0]}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Interest</p>
                  <p className="font-semibold text-slate-900">{offer.interestRate}% p.a.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Sanction</p>
                  <p className="font-semibold text-slate-900">{formatPrice(offer.approvedLoanAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">EMI</p>
                  <p className="text-lg font-bold text-finance-600">{formatRupees(offer.emi)}</p>
                </div>
              </label>
            ))}
          </div>

          {selected && status !== 'applied' && (
            <form onSubmit={apply} className="card mt-6 p-5">
              <h3 className="font-semibold text-slate-900">
                Apply with {selected.lender.name} — {formatRupees(selected.emi)}/month
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                A loan advisor will call you to collect documents and confirm the sanction.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label" htmlFor="apply-name">
                    Name
                  </label>
                  <input id="apply-name" name="fullName" required className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="apply-phone">
                    Mobile
                  </label>
                  <input id="apply-phone" name="phone" required inputMode="numeric" className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="apply-email">
                    Email (optional)
                  </label>
                  <input id="apply-email" name="email" type="email" className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="apply-city">
                    City
                  </label>
                  <select id="apply-city" name="citySlug" className="field" defaultValue="">
                    <option value="">Select</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.slug}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'applying'}
                className="btn-primary mt-4 bg-finance-500 hover:bg-finance-600"
              >
                {status === 'applying' ? 'Submitting…' : 'Submit loan application'}
              </button>
            </form>
          )}

          {status === 'applied' && (
            <div className="card mt-6 border-finance-500/30 bg-finance-50 p-6 text-center">
              <p className="text-2xl">✅</p>
              <h3 className="mt-2 font-semibold text-slate-900">Application submitted</h3>
              <p className="mt-1 text-sm text-slate-600">
                {selected?.lender.name} has your request. A loan advisor will call you shortly.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
