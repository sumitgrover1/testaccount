import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/testimonials', label: 'Testimonials' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-cream-50/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-wide text-brand-700">
          <Image src="/logo.svg" alt={siteConfig.name} width={36} height={36} className="rounded-full" priority unoptimized />
          {siteConfig.name}
        </Link>
        <ul className="hidden gap-8 text-sm font-medium text-charcoal-700 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition hover:text-brand-600">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/contact"
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Book Appointment
        </Link>
      </nav>
      <ul className="flex justify-center gap-6 border-t border-brand-100 py-2 text-xs font-medium text-charcoal-700 md:hidden">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition hover:text-brand-600">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
