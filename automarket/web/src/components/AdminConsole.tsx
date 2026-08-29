'use client';

import { useCallback, useEffect, useState } from 'react';
import { CLIENT_BASE } from '@/lib/api';
import { formatRupees } from '@/lib/format';

interface Lead {
  id: string;
  type: string;
  status: string;
  fullName: string;
  phone: string;
  email: string | null;
  vehicleType: string | null;
  createdAt: string;
  city: { name: string; state: string } | null;
  model: { name: string; brand: { name: string } } | null;
  variant: { name: string; exShowroomPrice: number } | null;
  metadata: Record<string, unknown> | null;
}

interface Overview {
  totals: {
    leads: number;
    leadsLast30Days: number;
    conversionRatePercent: number;
    loanApplicationsLast30Days: number;
    loanValueLast30Days: number;
    insuranceApplicationsLast30Days: number;
    insurancePremiumLast30Days: number;
  };
  leadsByType: { type: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  topModels: { modelId: string | null; name: string; leads: number }[];
  topCities: { cityId: string | null; name: string; leads: number }[];
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'DEALER_ASSIGNED', 'CONVERTED', 'LOST'];
const TYPES = ['ON_ROAD_PRICE', 'TEST_DRIVE', 'CALLBACK', 'FINANCE', 'INSURANCE', 'DEALER_CONTACT'];

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-brand-50 text-brand-700',
  CONTACTED: 'bg-amber-50 text-amber-700',
  QUALIFIED: 'bg-indigo-50 text-indigo-700',
  DEALER_ASSIGNED: 'bg-purple-50 text-purple-700',
  CONVERTED: 'bg-finance-50 text-finance-600',
  LOST: 'bg-red-50 text-red-600',
};

// The token lives in memory only. Persisting it to localStorage would leave a
// long-lived credential readable by any script that gets injected into the page.
export function AdminConsole() {
  const [token, setToken] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(`${CLIENT_BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
          ...(init?.headers ?? {}),
        },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? 'Request failed');
      return payload.data as T;
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      const [leadList, stats] = await Promise.all([
        authFetch<Lead[]>(`/leads?${params.toString()}`),
        authFetch<Overview>('/dashboard/overview'),
      ]);
      setLeads(leadList);
      setOverview(stats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load leads');
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const response = await fetch(`${CLIENT_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? 'Login failed');
      setToken(payload.data.accessToken as string);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    }
  }

  async function changeStatus(leadId: string, status: string) {
    try {
      await authFetch(`/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update the lead');
    }
  }

  if (!token) {
    return (
      <form onSubmit={login} className="card mx-auto max-w-sm p-6">
        <h1 className="text-lg font-bold text-slate-900">Sales console</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to work the lead queue.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="admin-email">
              Email
            </label>
            <input id="admin-email" name="email" type="email" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <input id="admin-password" name="password" type="password" required className="field" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary mt-4 w-full">
          Sign in
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Sales console</h1>
        <button type="button" onClick={() => setToken(null)} className="btn-outline py-2 text-xs">
          Sign out
        </button>
      </div>

      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Leads (all time)', value: overview.totals.leads.toLocaleString('en-IN') },
            { label: 'Leads (30 days)', value: overview.totals.leadsLast30Days.toLocaleString('en-IN') },
            {
              label: 'Loan value (30 days)',
              value: formatRupees(overview.totals.loanValueLast30Days),
            },
            {
              label: 'Premium quoted (30 days)',
              value: formatRupees(overview.totals.insurancePremiumLast30Days),
            },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <select
            className="field w-auto"
            value={filters.type}
            onChange={(event) => setFilters({ ...filters, type: event.target.value })}
          >
            <option value="">All lead types</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className="field w-auto"
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} className="btn-outline">
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Interest</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Received</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No leads match these filters yet.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{lead.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {lead.phone}
                    {lead.city ? ` · ${lead.city.name}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-800">
                    {lead.model ? `${lead.model.brand.name} ${lead.model.name}` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">{lead.variant?.name ?? ''}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="chip bg-slate-100 text-slate-600">{lead.type.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(lead.createdAt).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <select
                    className={`chip border-0 ${STATUS_STYLES[lead.status] ?? 'bg-slate-100 text-slate-600'}`}
                    value={lead.status}
                    onChange={(event) => void changeStatus(lead.id, event.target.value)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
