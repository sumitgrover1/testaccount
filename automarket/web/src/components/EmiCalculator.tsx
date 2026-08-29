'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPrice, formatRupees } from '@/lib/format';

// Mirrors the server's reducing-balance formula so the slider updates without a
// round trip; the authoritative figure on an application still comes from the API.
function computeEmi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 12 / 100;
  const growth = Math.pow(1 + monthlyRate, months);
  const emi = monthlyRate === 0 ? principal / months : (principal * monthlyRate * growth) / (growth - 1);
  const rounded = Math.round(emi);
  const totalPayable = rounded * months;
  return { emi: rounded, totalPayable, totalInterest: totalPayable - principal };
}

interface Props {
  defaultPrice?: number;
  onChange?: (state: { vehiclePrice: number; downPayment: number; tenureMonths: number; interestRate: number }) => void;
}

export function EmiCalculator({ defaultPrice = 1000000, onChange }: Props) {
  const [vehiclePrice, setVehiclePrice] = useState(defaultPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [interestRate, setInterestRate] = useState(9.5);

  const downPayment = Math.round((vehiclePrice * downPaymentPercent) / 100);
  const loanAmount = Math.max(vehiclePrice - downPayment, 0);
  const result = useMemo(
    () => computeEmi(loanAmount || 1, interestRate, tenureMonths),
    [loanAmount, interestRate, tenureMonths],
  );

  useEffect(() => {
    onChange?.({ vehiclePrice, downPayment, tenureMonths, interestRate });
  }, [vehiclePrice, downPayment, tenureMonths, interestRate, onChange]);

  const principalShare = loanAmount > 0 ? (loanAmount / result.totalPayable) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="emi-price">
                Vehicle price
              </label>
              <span className="font-semibold text-slate-900">{formatPrice(vehiclePrice)}</span>
            </div>
            <input
              id="emi-price"
              type="range"
              min={50000}
              max={5000000}
              step={10000}
              value={vehiclePrice}
              onChange={(event) => setVehiclePrice(Number(event.target.value))}
              className="mt-2 w-full accent-finance-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="emi-down">
                Down payment ({downPaymentPercent}%)
              </label>
              <span className="font-semibold text-slate-900">{formatRupees(downPayment)}</span>
            </div>
            <input
              id="emi-down"
              type="range"
              min={0}
              max={60}
              step={1}
              value={downPaymentPercent}
              onChange={(event) => setDownPaymentPercent(Number(event.target.value))}
              className="mt-2 w-full accent-finance-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="emi-rate">
                Interest rate
              </label>
              <span className="font-semibold text-slate-900">{interestRate.toFixed(2)}% p.a.</span>
            </div>
            <input
              id="emi-rate"
              type="range"
              min={6}
              max={24}
              step={0.05}
              value={interestRate}
              onChange={(event) => setInterestRate(Number(event.target.value))}
              className="mt-2 w-full accent-finance-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="emi-tenure">
                Tenure
              </label>
              <span className="font-semibold text-slate-900">
                {tenureMonths} months ({(tenureMonths / 12).toFixed(1)} yrs)
              </span>
            </div>
            <input
              id="emi-tenure"
              type="range"
              min={12}
              max={96}
              step={6}
              value={tenureMonths}
              onChange={(event) => setTenureMonths(Number(event.target.value))}
              className="mt-2 w-full accent-finance-500"
            />
          </div>
        </div>

        <div className="rounded-xl bg-finance-50 p-5 text-center">
          <p className="text-sm text-slate-500">Your monthly EMI</p>
          <p className="mt-1 text-3xl font-bold text-finance-600">{formatRupees(result.emi)}</p>

          <dl className="mt-5 space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Loan amount</dt>
              <dd className="font-semibold text-slate-800">{formatRupees(loanAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Total interest</dt>
              <dd className="font-semibold text-slate-800">{formatRupees(result.totalInterest)}</dd>
            </div>
            <div className="flex justify-between border-t border-finance-500/20 pt-2">
              <dt className="text-slate-500">Total payable</dt>
              <dd className="font-bold text-slate-900">{formatRupees(result.totalPayable)}</dd>
            </div>
          </dl>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-finance-500" style={{ width: `${principalShare}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {principalShare.toFixed(0)}% principal · {(100 - principalShare).toFixed(0)}% interest
          </p>
        </div>
      </div>
    </div>
  );
}
