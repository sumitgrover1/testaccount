import Link from 'next/link';
import { siteConfig } from '@/config/site';

// A persistent bottom action bar on mobile — where most local-clinic traffic
// comes from — keeps "Call" and "Book" one thumb-tap away on every page
// instead of relying on users to scroll back to the nav.
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brand-200 bg-cream-50/95 backdrop-blur md:hidden">
      <a
        href={`tel:${siteConfig.phone}`}
        className="flex-1 border-r border-brand-200 py-3 text-center text-sm font-semibold text-brand-700"
      >
        Call Now
      </a>
      <Link
        href="/contact"
        className="flex-1 bg-brand-600 py-3 text-center text-sm font-semibold text-white"
      >
        Book Appointment
      </Link>
    </div>
  );
}
