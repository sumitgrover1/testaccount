import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBlogPosts, fetchBlogTags } from '@/lib/api';
import { siteConfig } from '@/config/site';
import { CategoryIconBadge, formatCategoryLabel } from '@/lib/categoryIcon';
import { BlogCover } from '@/components/BlogCover';

const title = 'Skin, Hair & Weight Management Blog';
const description = `Educational articles on skin care, hair care, and weight management from the ${siteConfig.name} team.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/blog' },
  openGraph: { title, description, url: '/blog' },
  twitter: { title, description },
};

const CATEGORIES = ['SKIN', 'HAIR', 'WEIGHT_MANAGEMENT', 'GENERAL'];
const PAGE_SIZE = 9;

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function pillClasses(active: boolean): string {
  return `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    active ? 'bg-brand-600 text-white' : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
  }`;
}

function tagPillClasses(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-brand-100 text-charcoal-700 hover:border-brand-300'
  }`;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; page?: string }>;
}) {
  const { category, tag, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ data: posts, pagination }, tags] = await Promise.all([
    fetchBlogPosts({ page, limit: PAGE_SIZE, category, tag }),
    fetchBlogTags(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-600">Blog</p>
      <h1 className="mt-4 font-serif text-4xl text-charcoal-900">Skin, Hair &amp; Weight Management</h1>
      <p className="mt-4 max-w-2xl text-charcoal-700">
        Educational articles from our team — general information to help you understand your skin,
        hair, and body better. Always consult our doctors for advice specific to you.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href={`/blog${buildQuery({ tag })}`} className={pillClasses(!category)}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/blog${buildQuery({ category: c, tag })}`} className={pillClasses(category === c)}>
            {formatCategoryLabel(c)}
          </Link>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-charcoal-700">Topics:</span>
          {tags.map((t) => (
            <Link key={t.slug} href={`/blog${buildQuery({ category, tag: t.slug })}`} className={tagPillClasses(tag === t.slug)}>
              #{t.name}
            </Link>
          ))}
          {tag && (
            <Link href={`/blog${buildQuery({ category })}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Clear topic ✕
            </Link>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="mt-12 text-charcoal-700">
          {category || tag ? (
            <>
              No articles in this section yet — browse{' '}
              <Link href="/blog" className="font-medium text-brand-600 hover:text-brand-700">
                all articles
              </Link>{' '}
              instead.
            </>
          ) : (
            <>
              Our blog is being updated — please check back soon, or{' '}
              <Link href="/contact" className="font-medium text-brand-600 hover:text-brand-700">
                contact us
              </Link>{' '}
              with any questions in the meantime.
            </>
          )}
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-brand-100 transition hover:border-brand-300 hover:shadow-sm"
            >
              <BlogCover slug={post.slug} category={post.category} />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <CategoryIconBadge category={post.category} />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
                    {formatCategoryLabel(post.category)}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-lg text-charcoal-900">{post.title}</h2>
                <p className="mt-2 flex-1 text-sm text-charcoal-700">{post.excerpt}</p>
                <p className="mt-4 text-xs text-charcoal-700">{post.readTimeMinutes} min read</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Blog pagination">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/blog${buildQuery({ category, tag, page: p === 1 ? undefined : String(p) })}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
                p === pagination.page ? 'bg-brand-600 text-white' : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
              aria-current={p === pagination.page ? 'page' : undefined}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}

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
