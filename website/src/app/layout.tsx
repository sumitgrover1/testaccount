import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { MobileStickyCta } from '@/components/MobileStickyCta';
import { JsonLd } from '@/components/JsonLd';
import { localBusinessSchema } from '@/lib/structuredData';
import { siteConfig } from '@/config/site';
import { fetchGoogleReviews } from '@/lib/api';
import './globals.css';

// title.template lets every page set only its own segment (e.g. "Services")
// while still getting a consistent, SEO-friendly full title.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s — ${siteConfig.name}` },
  description: siteConfig.description,
  keywords: [
    'skin clinic Gurugram',
    'hair treatment Gurugram',
    'cosmetology clinic',
    'aesthetic clinic Gurugram',
    'best skin specialist Gurugram',
    ...siteConfig.areasServed.map((area) => `skin clinic ${area}`),
    siteConfig.name,
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    locale: 'en_IN',
    url: siteConfig.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Feeds the clinic's live Google rating into the LocalBusiness schema
  // (aggregateRating) when configured — see structuredData.ts. Reuses the
  // same cached fetch the Testimonials page already makes, so this adds no
  // extra Google API calls.
  const googleReviews = await fetchGoogleReviews();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col pb-16 md:pb-0">
        <JsonLd data={localBusinessSchema(googleReviews.rating, googleReviews.totalReviews)} />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
        <MobileStickyCta />
      </body>
    </html>
  );
}
