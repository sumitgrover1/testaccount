import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { fetchBlogPosts } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { CATEGORY_CONTENT } from '@/lib/categoryContent';

const routes = ['', '/about', '/services', '/gallery', '/testimonials', '/faq', '/blog', '/contact'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/contact' || route === '/services' ? 0.9 : 0.6,
  }));

  // One dedicated landing page per treatment category — see
  // lib/categoryContent.ts for why these are per-category rather than
  // per-individual-treatment.
  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_CONTENT.map((c) => ({
    url: `${siteConfig.url}/services/${slugify(c.category)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // The public blog listing is paged, but the sitemap needs every slug — the
  // backend's public-list endpoint caps a single page at 500, comfortably
  // above the current article count.
  const { data: posts } = await fetchBlogPosts({ limit: 500 });
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticEntries, ...categoryEntries, ...blogEntries];
}
