import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchBlogPostBySlug, fetchBlogPosts } from '@/lib/api';
import { siteConfig } from '@/config/site';
import { CategoryIconBadge, formatCategoryLabel } from '@/lib/categoryIcon';
import { JsonLd } from '@/components/JsonLd';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.excerpt, publishedTime: post.publishedAt },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) notFound();

  const allPosts = await fetchBlogPosts();
  const related = allPosts.filter((p) => p.category === post.category && p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: siteConfig.name },
    publisher: { '@type': 'Organization', name: siteConfig.name },
  };

  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
      <JsonLd data={articleSchema} />

      <Link href="/blog" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to Blog
      </Link>

      <div className="mt-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CategoryIconBadge category={post.category} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
          {formatCategoryLabel(post.category)}
        </span>
      </div>

      <h1 className="mt-4 font-serif text-3xl leading-tight text-charcoal-900 md:text-4xl">{post.title}</h1>
      <p className="mt-3 text-xs text-charcoal-700">
        {new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
        {' · '}
        {post.readTimeMinutes} min read
      </p>

      <div className="mt-8 space-y-4">
        {post.content.map((paragraph, i) => (
          <p key={i} className="text-charcoal-700">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-cream-100 p-8 text-center">
        <h3 className="font-serif text-xl text-charcoal-900">Have questions about this?</h3>
        <p className="mt-2 text-sm text-charcoal-700">Book a consultation with our doctors.</p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-brand-600 px-7 py-3 text-sm font-medium text-white hover:bg-brand-700"
        >
          Book a Consultation
        </Link>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="font-serif text-2xl text-charcoal-900">Related Articles</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="rounded-2xl border border-brand-100 p-5 transition hover:border-brand-300 hover:shadow-sm"
              >
                <h3 className="font-serif text-base text-charcoal-900">{r.title}</h3>
                <p className="mt-2 text-xs text-charcoal-700">{r.readTimeMinutes} min read</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
