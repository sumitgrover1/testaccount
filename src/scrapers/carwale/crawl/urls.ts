import type { RecordKind } from '../types';
import { absoluteUrl, cleanText, type Dom } from '../parse/html';

/**
 * Query parameters that change the URL without changing the page. Dropping
 * them is what stops a crawl from fetching the same model page a few hundred
 * times because every internal link carries a different campaign tag.
 */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
  /^igshid$/i,
  /^_ga$/i,
  /^mc_[ce]id$/i,
  /^ref_?src$/i,
];

/** Assets and downloads: linked from content pages but never worth parsing as one. */
const NON_HTML_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|json|pdf|zip|gz|mp4|webm|mp3|woff2?|ttf|eot)$/i;

export function normalizeUrl(input: string, base?: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(input, base);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;

  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');

  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) parsed.searchParams.delete(key);
  }
  // Sorting makes ?a=1&b=2 and ?b=2&a=1 one URL rather than two.
  parsed.searchParams.sort();

  return parsed.toString();
}

/**
 * The key the visited-set is keyed on. Deliberately looser than the fetch URL:
 * `/swift/` and `/swift` are the same page, and treating them as two is the
 * single easiest way to double the size of a crawl for nothing.
 */
export function dedupeKey(url: string): string {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${parsed.host}${path.toLowerCase()}${parsed.search}`;
}

export function isSameSite(url: string, baseUrl: string): boolean {
  try {
    const host = new URL(url).hostname;
    const baseHost = new URL(baseUrl).hostname;
    const root = baseHost.replace(/^www\./, '');
    return host === baseHost || host === root || host.endsWith(`.${root}`);
  } catch {
    return false;
  }
}

export function looksLikeHtml(url: string): boolean {
  try {
    return !NON_HTML_EXTENSIONS.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export interface UrlPattern {
  kind: RecordKind;
  pattern: RegExp;
  /**
   * Higher wins when several patterns match — used-car detail URLs sit under
   * the same `/used/` prefix as the city listing pages, so ordering by
   * specificity matters more than declaration order.
   */
  priority: number;
}

/**
 * URL shapes on carwale.com, most specific first.
 *
 * A URL classifier rather than a content sniffer, because knowing a page's
 * kind *before* fetching it is what lets the frontier prioritise detail pages
 * over pagination and lets `--only` skip whole sections without downloading
 * them. `classifyUrl` returns `unclassified_page` when nothing matches, and
 * those pages are still crawled and emitted — an unmodelled section shows up
 * in the output instead of vanishing.
 */
export const defaultUrlPatterns: UrlPattern[] = [
  { kind: 'used_car_listing', pattern: /\/used\/[^/]*\/[^/]*-d\d+\/?$/i, priority: 100 },
  { kind: 'used_car_listing', pattern: /\/used\/(?:cars?|stock)[^/]*\/[^/]+-\d+\/?$/i, priority: 90 },
  { kind: 'review', pattern: /\/(?:expert-review|user-reviews|reviews)\b/i, priority: 80 },
  { kind: 'news_article', pattern: /\/(?:news|features|advice|comparison-tests)\//i, priority: 70 },
  { kind: 'dealer', pattern: /\/(?:dealers?|dealer-showrooms?|car-dealers)\b/i, priority: 60 },
  {
    kind: 'new_car_model',
    pattern: /^\/[a-z0-9-]+-cars\/[a-z0-9-]+\/?$/i,
    priority: 50,
  },
];

export function classifyUrl(url: string, patterns: UrlPattern[] = defaultUrlPatterns): RecordKind {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'unclassified_page';
  }
  const target = parsed.pathname;
  const full = parsed.pathname + parsed.search;

  let best: UrlPattern | undefined;
  for (const candidate of patterns) {
    if (!candidate.pattern.test(target) && !candidate.pattern.test(full)) continue;
    if (!best || candidate.priority > best.priority) best = candidate;
  }
  return best?.kind ?? 'unclassified_page';
}

export interface DiscoveredLink {
  url: string;
  kind: RecordKind;
  anchorText?: string;
}

/**
 * Every in-scope, HTML-looking link on a page, de-duplicated.
 *
 * Links inside header/footer/nav are excluded by default: they are identical
 * on every page, so following them from each one adds nothing and makes the
 * frontier churn through chrome instead of content.
 */
export function extractLinks(
  $: Dom,
  pageUrl: string,
  baseUrl: string,
  options: { ignoredContainers?: string[]; patterns?: UrlPattern[] } = {},
): DiscoveredLink[] {
  const ignored = options.ignoredContainers ?? [];
  const seen = new Set<string>();
  const links: DiscoveredLink[] = [];

  $('a[href]').each((_i, el) => {
    const node = $(el);
    if (ignored.length && node.closest(ignored.join(',')).length) return;

    const href = node.attr('href');
    if (!href || href.startsWith('#') || /^(?:javascript|mailto|tel):/i.test(href)) return;

    const resolved = absoluteUrl(pageUrl, href);
    if (!resolved) return;
    const normalized = normalizeUrl(resolved);
    if (!normalized || !isSameSite(normalized, baseUrl) || !looksLikeHtml(normalized)) return;

    const key = dedupeKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);

    links.push({
      url: normalized,
      kind: classifyUrl(normalized, options.patterns),
      anchorText: cleanText(node.text()),
    });
  });

  return links;
}
