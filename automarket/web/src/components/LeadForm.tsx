'use client';

import { useState } from 'react';
import { clientPost } from '@/lib/api';
import type { City, VehicleType } from '@/lib/types';

export type LeadType = 'TEST_DRIVE' | 'DEALER_CONTACT' | 'CALLBACK';

interface LeadFormProps {
  type: LeadType;
  vehicleType?: VehicleType;
  modelId?: string;
  variantId?: string;
  cities?: City[];
  title: string;
  description?: string;
  submitLabel: string;
}

export function LeadForm({
  type,
  vehicleType,
  modelId,
  variantId,
  cities = [],
  title,
  description,
  submitLabel,
}: LeadFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('submitting');
    setError(null);

    try {
      await clientPost('/leads/capture', {
        type,
        vehicleType,
        modelId,
        variantId,
        fullName: form.get('fullName'),
        phone: form.get('phone'),
        email: form.get('email') || undefined,
        citySlug: form.get('citySlug') || undefined,
        message: form.get('message') || undefined,
        consentToContact: true,
      });
      setStatus('done');
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong');
    }
  }

  if (status === 'done') {
    return (
      <div className="card border-finance-500/30 bg-finance-50 p-6 text-center">
        <p className="text-2xl">✅</p>
        <h3 className="mt-2 font-semibold text-slate-900">Request received</h3>
        <p className="mt-1 text-sm text-slate-600">
          Our team will call you on the number you shared, usually within a couple of hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}

      <div className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor={`${type}-name`}>
            Your name
          </label>
          <input id={`${type}-name`} name="fullName" required minLength={2} maxLength={80} className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${type}-phone`}>
            Mobile number
          </label>
          <input
            id={`${type}-phone`}
            name="phone"
            required
            inputMode="numeric"
            pattern="[0-9+ ]{10,15}"
            placeholder="10-digit mobile number"
            className="field"
          />
        </div>
        {cities.length > 0 && (
          <div>
            <label className="label" htmlFor={`${type}-city`}>
              City
            </label>
            <select id={`${type}-city`} name="citySlug" className="field" defaultValue="">
              <option value="">Select your city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.slug}>
                  {city.name}, {city.state}
                </option>
              ))}
            </select>
          </div>
        )}
        {type === 'CALLBACK' && (
          <div>
            <label className="label" htmlFor={`${type}-message`}>
              What would you like to know? (optional)
            </label>
            <textarea id={`${type}-message`} name="message" rows={3} maxLength={500} className="field" />
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={status === 'submitting'} className="btn-primary mt-4 w-full">
        {status === 'submitting' ? 'Submitting…' : submitLabel}
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">
        By submitting you agree to be contacted about this enquiry.
      </p>
    </form>
  );
}
