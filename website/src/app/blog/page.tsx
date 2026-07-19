import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/content/blogPosts';
import { siteConfig } from '@/config/site';
import { CategoryIconBadge } from '@/lib/categoryIcon';

export const metadata: Metadata = {
  title: 'Skin, Hair & Weight Management Blog',
  description: `Educational articles on skin care, hair care, and weight management from the ${siteConfig.name} team.`,
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  const sorted = [...blogPosts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">Blog</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Skin, Hair &amp; Weight Management</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        Educational articles from our team — general information to help you understand your skin,
        hair, and body better. Always consult our doctors for advice specific to you.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex flex-col rounded-2xl border border-brand-100 p-6 transition hover:border-brand-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <CategoryIconBadge category={post.category} />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{post.category}</span>
            </div>
            <h2 className="mt-3 font-serif text-lg text-charcoal-900">{post.title}</h2>
            <p className="mt-2 flex-1 text-sm text-charcoal-700">{post.excerpt}</p>
            <p className="mt-4 text-xs text-charcoal-700">{post.readTimeMinutes} min read</p>
          </Link>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Have a specific question?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Our team is happy to answer it during a consultation.</p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-brand-600 px-7 py-3 text-sm font-medium text-white hover:bg-brand-700"
        >
          Book a Consultation
        </Link>
      </div>
    </div>
  );
}
