import Link from 'next/link';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Vehicles',
    links: [
      { href: '/new-cars', label: 'New cars' },
      { href: '/bikes', label: 'Bikes & scooters' },
      { href: '/buses', label: 'Buses' },
      { href: '/tractors', label: 'Tractors' },
      { href: '/compare', label: 'Compare vehicles' },
    ],
  },
  {
    title: 'Finance',
    links: [
      { href: '/finance', label: 'Vehicle loans' },
      { href: '/finance#emi-calculator', label: 'EMI calculator' },
      { href: '/finance#eligibility', label: 'Check eligibility' },
      { href: '/finance#offers', label: 'Compare lenders' },
    ],
  },
  {
    title: 'Insurance',
    links: [
      { href: '/insurance', label: 'Motor insurance' },
      { href: '/insurance/car', label: 'Car insurance' },
      { href: '/insurance/bike', label: 'Two-wheeler insurance' },
      { href: '/insurance/tractor', label: 'Tractor insurance' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              A
            </span>
            <span className="font-bold text-brand-900">AutoMarket</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Vehicle research, city-wise on-road prices, loan offers and insurance quotes — for cars,
            bikes, buses and tractors.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-slate-900">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-500 transition hover:text-brand-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 py-6">
        <div className="container-page flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AutoMarket. Prices are indicative and vary by dealer and city.</p>
          <p>Insurance and loan offers are subject to insurer and lender approval.</p>
        </div>
      </div>
    </footer>
  );
}
