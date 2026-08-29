import type { HttpClient } from '../http/client';
import type { Logger } from '../logger';
import { loadXml } from '../parse/html';
import { normalizeUrl } from '../crawl/urls';

export interface SitemapEntry {
  url: string;
  lastModified?: string;
}

export interface ParsedSitemap {
  /** Child sitemaps, when the document is a <sitemapindex>. */
  sitemaps: string[];
  entries: SitemapEntry[];
}

export function parseSitemap(xml: string): ParsedSitemap {
  const $ = loadXml(xml);
  const sitemaps: string[] = [];
  const entries: SitemapEntry[] = [];

  $('sitemapindex > sitemap > loc').each((_i, el) => {
    const loc = $(el).text().trim();
    if (loc) sitemaps.push(loc);
  });

  $('urlset > url').each((_i, el) => {
    const node = $(el);
    const loc = node.find('loc').first().text().trim();
    if (!loc) return;
    entries.push({
      url: loc,
      lastModified: node.find('lastmod').first().text().trim() || undefined,
    });
  });

  return { sitemaps, entries };
}

export interface CrawlSitemapsOptions {
  client: HttpClient;
  logger: Logger;
  /** Stop after this many URLs. 0 means unlimited. */
  maxUrls?: number;
  /** Guards against a sitemap index that references itself, directly or in a cycle. */
  maxDepth?: number;
  onEntry?: (entry: SitemapEntry) => void;
}

/**
 * Walks a sitemap index tree and returns every URL it points at.
 *
 * Sitemaps are the shortest path to a *complete* crawl: they enumerate what
 * the site itself considers its content, including pages that no navigation
 * path reaches within a sane link depth. A link crawl is still needed for what
 * sitemaps omit, so the crawler seeds from both.
 */
export async function crawlSitemaps(
  roots: string[],
  options: CrawlSitemapsOptions,
): Promise<SitemapEntry[]> {
  const { client, logger } = options;
  const maxUrls = options.maxUrls ?? 0;
  const maxDepth = options.maxDepth ?? 5;

  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const queue: Array<{ url: string; depth: number }> = roots.map((url) => ({ url, depth: 0 }));

  while (queue.length) {
    const next = queue.shift();
    if (!next) break;
    const normalized = normalizeUrl(next.url);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (next.depth > maxDepth) continue;

    try {
      const response = await client.get(normalized, {
        // `.xml.gz` is gzip *content*: fetch will not decompress it, since the
        // transfer encoding is identity. Everything else arrives as plain XML.
        decompress: normalized.endsWith('.gz'),
        accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
      });
      if (response.status >= 400) {
        logger.warn({ url: normalized, status: response.status }, 'sitemap fetch failed');
        continue;
      }

      const parsed = parseSitemap(response.body);
      for (const child of parsed.sitemaps) {
        queue.push({ url: new URL(child, normalized).toString(), depth: next.depth + 1 });
      }
      for (const entry of parsed.entries) {
        const url = normalizeUrl(entry.url);
        if (!url) continue;
        const record = { url, lastModified: entry.lastModified };
        entries.push(record);
        options.onEntry?.(record);
        if (maxUrls && entries.length >= maxUrls) return entries;
      }

      logger.debug(
        { url: normalized, children: parsed.sitemaps.length, urls: parsed.entries.length },
        'sitemap parsed',
      );
    } catch (err) {
      logger.warn({ url: normalized, err }, 'sitemap could not be read');
    }
  }

  return entries;
}
