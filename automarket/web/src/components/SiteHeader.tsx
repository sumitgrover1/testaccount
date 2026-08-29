import Link from 'next/link';
import { SearchBox } from './SearchBox';

const NAV = [
  { href: '/new-cars', label: 'New Cars' },
  { href: '/bikes', label: 'Bikes' },
  { href: '/buses', label: 'Buses' },
  { href: '/tractors', label: 'Tractors' },
  { href: '/compare', label: 'Compare' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            A
          </span>
          <span className="text-lg font-bold tracking-tight text-brand-900">AutoMarket</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-56 md:block">
            <SearchBox compact />
          </div>
          {/* The two verticals are their own products, so they get their own
              entry points rather than hiding inside a nav dropdown. */}
          <Link
            href="/finance"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-finance-600 transition hover:bg-finance-50 sm:inline-flex"
          >
            Finance
          </Link>
          <Link
            href="/insurance"
            className="rounded-lg bg-insure-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-insure-600"
          >
            Insurance
          </Link>
        </div>
      </div>

      <nav className="container-page flex gap-1 overflow-x-auto pb-2 lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
