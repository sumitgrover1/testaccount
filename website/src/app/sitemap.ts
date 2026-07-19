import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

const routes = ['', '/about', '/services', '/gallery', '/testimonials', '/faq', '/contact'];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/contact' || route === '/services' ? 0.9 : 0.6,
  }));
}
