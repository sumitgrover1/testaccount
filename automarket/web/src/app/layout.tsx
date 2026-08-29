import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: {
    default: 'AutoMarket — New cars, bikes, buses & tractors with on-road price, finance and insurance',
    template: '%s | AutoMarket',
  },
  description:
    'Compare new cars, bikes, buses and tractors in India. Get the exact city-wise on-road price breakup, check car loan EMI and eligibility across banks, and compare motor insurance premiums from top insurers.',
  keywords: [
    'new cars',
    'bike price',
    'tractor price',
    'bus price',
    'on road price',
    'car loan EMI',
    'car insurance',
  ],
  openGraph: {
    type: 'website',
    siteName: 'AutoMarket',
    title: 'AutoMarket — vehicle prices, finance and insurance in one place',
    description:
      'On-road price breakups for every city, loan offers from banks and NBFCs, and motor insurance quotes from top insurers.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
