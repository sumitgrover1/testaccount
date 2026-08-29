import fs from 'fs';

/**
 * CSS selectors live in data, not in code, and every field takes a *list*.
 *
 * Two deliberate choices behind that:
 *
 * 1. Ordered fallbacks. Each list runs best-guess-first and stops at the first
 *    hit, so a class-name change breaks one entry rather than the field. The
 *    last entry in most lists is a document-level standard (Open Graph,
 *    schema.org `itemprop`, `<h1>`) that survives redesigns.
 * 2. Overridable at runtime. `--selectors ./my-selectors.json` deep-merges a
 *    JSON file over these defaults, so re-pointing the scraper after a markup
 *    change is a config edit, not a code change and redeploy.
 *
 * These defaults were written without access to CarWale's live markup (the
 * build environment cannot reach the site), so treat the CSS entries as a
 * starting point to verify — see the "Tuning selectors" section of README.md
 * for the `inspect` command that prints what each one currently matches. The
 * structured-data extractors (JSON-LD, __NEXT_DATA__) do not depend on them
 * and are tried first for every field.
 */
export interface SelectorSet {
  common: {
    canonical: string[];
    title: string[];
    ogTitle: string[];
    ogImage: string[];
    description: string[];
    breadcrumb: string[];
    /** Containers whose links are navigation chrome rather than content. */
    ignoredLinkContainers: string[];
  };
  newCarModel: {
    title: string[];
    brand: string[];
    price: string[];
    rating: string[];
    ratingCount: string[];
    description: string[];
    images: string[];
    keySpecItem: string[];
    keySpecLabel: string[];
    keySpecValue: string[];
    specGroup: string[];
    specGroupTitle: string[];
    specRow: string[];
    specLabel: string[];
    specValue: string[];
    featureItem: string[];
    variantRow: string[];
    variantName: string[];
    variantPrice: string[];
    variantLink: string[];
    variantFuel: string[];
    variantTransmission: string[];
  };
  usedCar: {
    title: string[];
    price: string[];
    kilometres: string[];
    fuelType: string[];
    transmission: string[];
    owners: string[];
    year: string[];
    city: string[];
    sellerName: string[];
    sellerType: string[];
    images: string[];
    highlightItem: string[];
    detailRow: string[];
    detailLabel: string[];
    detailValue: string[];
  };
  dealer: {
    name: string[];
    address: string[];
    phone: string[];
    city: string[];
  };
  review: {
    container: string[];
    author: string[];
    rating: string[];
    title: string[];
    body: string[];
    date: string[];
  };
  article: {
    headline: string[];
    author: string[];
    date: string[];
    body: string[];
    tag: string[];
  };
}

export const defaultSelectors: SelectorSet = {
  common: {
    canonical: ['link[rel="canonical"]'],
    title: ['h1', 'title'],
    ogTitle: ['meta[property="og:title"]'],
    ogImage: ['meta[property="og:image"]'],
    description: ['meta[name="description"]', 'meta[property="og:description"]'],
    breadcrumb: ['nav[aria-label="breadcrumb"] a', '.breadcrumb a', '[itemtype*="BreadcrumbList"] a'],
    ignoredLinkContainers: ['header', 'footer', 'nav', '[role="navigation"]', '.footer', '.header'],
  },
  newCarModel: {
    title: ['h1[data-testid="model-title"]', 'h1.model-name', 'h1'],
    brand: ['[data-testid="brand-name"]', '[itemprop="brand"]', '.brand-name'],
    price: [
      '[data-testid="model-price"]',
      '[itemprop="offers"] [itemprop="price"]',
      '.price-range',
      '.model-price',
    ],
    rating: ['[itemprop="ratingValue"]', '[data-testid="rating-value"]', '.rating-value'],
    ratingCount: ['[itemprop="reviewCount"]', '[itemprop="ratingCount"]', '.rating-count'],
    description: ['[data-testid="model-description"]', '.model-description', 'section.overview p'],
    images: ['[data-testid="gallery"] img', '.gallery img', 'figure img', 'main img'],
    keySpecItem: ['[data-testid="key-specs"] li', '.key-specs li', '.specs-summary li'],
    keySpecLabel: ['.label', 'dt', 'span:first-child'],
    keySpecValue: ['.value', 'dd', 'span:last-child'],
    specGroup: ['[data-testid="spec-group"]', 'section.specifications table', '.spec-group'],
    specGroupTitle: ['h2', 'h3', 'caption', '.group-title'],
    specRow: ['tr', 'li', '.spec-row'],
    specLabel: ['th', 'td:first-child', '.spec-label', 'dt'],
    specValue: ['td:last-child', '.spec-value', 'dd'],
    featureItem: ['[data-testid="features"] li', '.features li', 'section.features li'],
    variantRow: ['[data-testid="variant-row"]', 'table.variants tbody tr', '.variant-list li'],
    variantName: ['.variant-name', 'a', 'td:first-child'],
    variantPrice: ['.variant-price', 'td:last-child', '[data-testid="variant-price"]'],
    variantLink: ['a[href]'],
    variantFuel: ['.variant-fuel', '[data-testid="variant-fuel"]'],
    variantTransmission: ['.variant-transmission', '[data-testid="variant-transmission"]'],
  },
  usedCar: {
    title: ['h1[data-testid="stock-title"]', 'h1.car-title', 'h1'],
    price: ['[data-testid="stock-price"]', '.car-price', '[itemprop="price"]'],
    kilometres: ['[data-testid="km-driven"]', '.km-driven'],
    fuelType: ['[data-testid="fuel-type"]', '.fuel-type'],
    transmission: ['[data-testid="transmission"]', '.transmission'],
    owners: ['[data-testid="owners"]', '.owner-count'],
    year: ['[data-testid="reg-year"]', '.reg-year'],
    city: ['[data-testid="city"]', '.car-city', '.location'],
    sellerName: ['[data-testid="seller-name"]', '.seller-name'],
    sellerType: ['[data-testid="seller-type"]', '.seller-type'],
    images: ['[data-testid="stock-gallery"] img', '.gallery img', 'figure img'],
    highlightItem: ['[data-testid="highlights"] li', '.highlights li'],
    detailRow: ['[data-testid="detail-row"]', '.car-details tr', '.overview-list li'],
    detailLabel: ['.label', 'td:first-child', 'th', 'dt'],
    detailValue: ['.value', 'td:last-child', 'dd'],
  },
  dealer: {
    name: ['h1', '[itemprop="name"]', '.dealer-name'],
    address: ['[itemprop="address"]', '.dealer-address', 'address'],
    phone: ['[itemprop="telephone"]', 'a[href^="tel:"]', '.dealer-phone'],
    city: ['[itemprop="addressLocality"]', '.dealer-city'],
  },
  review: {
    container: ['[itemprop="review"]', '[data-testid="review-card"]', '.review-card'],
    author: ['[itemprop="author"]', '.review-author'],
    rating: ['[itemprop="ratingValue"]', '.review-rating'],
    title: ['[itemprop="name"]', '.review-title', 'h3'],
    body: ['[itemprop="reviewBody"]', '.review-body', 'p'],
    date: ['[itemprop="datePublished"]', 'time', '.review-date'],
  },
  article: {
    headline: ['h1', '[itemprop="headline"]'],
    author: ['[itemprop="author"]', '.author-name', 'a[rel="author"]'],
    date: ['[itemprop="datePublished"]', 'time[datetime]', '.publish-date'],
    body: ['[itemprop="articleBody"]', 'article', '.article-body'],
    tag: ['.tags a', '[rel="tag"]', '.article-tags a'],
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Merge is one level deep per section and *replaces* selector arrays rather
 * than concatenating them: an override exists precisely because the default
 * list is wrong, and appending would leave the broken selector matching first.
 */
export function mergeSelectors(
  base: SelectorSet,
  override: DeepPartial<SelectorSet> | undefined,
): SelectorSet {
  if (!override) return base;
  const merged = { ...base } as Record<string, Record<string, string[]>>;
  for (const [section, fields] of Object.entries(override as Record<string, unknown>)) {
    if (!fields || typeof fields !== 'object') continue;
    merged[section] = { ...(merged[section] ?? {}), ...(fields as Record<string, string[]>) };
  }
  return merged as unknown as SelectorSet;
}

export function loadSelectors(file?: string): SelectorSet {
  if (!file) return defaultSelectors;
  const raw = fs.readFileSync(file, 'utf8');
  return mergeSelectors(defaultSelectors, JSON.parse(raw) as DeepPartial<SelectorSet>);
}
