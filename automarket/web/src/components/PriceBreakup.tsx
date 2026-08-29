import { formatRupees } from '@/lib/format';
import type { BreakupLine } from '@/lib/types';

export function PriceBreakup({ lines, total }: { lines: BreakupLine[]; total: number }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {lines.map((line) => (
            <tr key={line.key} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{line.label}</p>
                {line.note && <p className="text-xs text-slate-400">{line.note}</p>}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                  line.amount < 0 ? 'text-finance-600' : 'text-slate-900'
                }`}
              >
                {line.amount < 0 ? `− ${formatRupees(Math.abs(line.amount))}` : formatRupees(line.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-brand-50">
            <td className="px-4 py-4 font-bold text-brand-900">Total on-road price</td>
            <td className="whitespace-nowrap px-4 py-4 text-right text-lg font-bold text-brand-900">
              {formatRupees(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
