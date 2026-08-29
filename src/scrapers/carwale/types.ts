/**
 * Domain types for the CarWale scraper.
 *
 * Every record the crawler emits carries a `meta` block alongside its payload
 * so that a downstream consumer can tell *when* a fact was true, *where* it
 * came from and *how* it was extracted. `strategies` matters in particular:
 * structured-data extraction (JSON-LD / embedded app state) survives a site
 * redesign, CSS-selector extraction does not, so a sudden drop in
 * structured-data coverage is the early warning that selectors need updating.
 */

/** How a record's fields were obtained, in the order the extractors ran. */
export type ExtractionStrategy = 'json-ld' | 'next-data' | 'embedded-json' | 'microdata' | 'css';

export type RecordKind =
  | 'new_car_model'
  | 'used_car_listing'
  | 'dealer'
  | 'review'
  | 'news_article'
  | 'unclassified_page';

export interface ScrapeMeta {
  /** The normalised URL that was fetched. */
  url: string;
  /** `<link rel="canonical">` when the page declares one — often differs from `url`. */
  canonicalUrl?: string;
  fetchedAt: string;
  httpStatus: number;
  strategies: ExtractionStrategy[];
  /**
   * SHA-256 of the extracted payload (not the raw HTML, which churns on every
   * request because of ad slots and CSRF nonces). Lets a re-crawl diff records
   * cheaply and skip writing rows that have not actually changed.
   */
  contentHash: string;
  /** Crawl depth at which this URL was discovered; 0 for seeds. */
  depth: number;
}

export interface PriceRange {
  /** Rupees. Both bounds are equal for a single-valued price. */
  min?: number;
  max?: number;
  /** The price exactly as the page rendered it, e.g. "₹ 6.49 - 9.14 Lakh". */
  label?: string;
  currency: 'INR';
}

export interface Rating {
  value?: number;
  count?: number;
  best?: number;
}

export interface VariantSummary {
  name: string;
  url?: string;
  price?: PriceRange;
  fuelType?: string;
  transmission?: string;
  engineCc?: number;
  mileageKmpl?: number;
}

/**
 * Specifications keep the site's own grouping ("Engine & Transmission",
 * "Dimensions & Weight", …) rather than being flattened into a fixed schema:
 * the spec labels differ per body type and per fuel type, and an open map
 * means a new label appears in the output instead of being silently dropped.
 */
export type SpecGroups = Record<string, Record<string, string>>;

export interface NewCarModel {
  kind: 'new_car_model';
  meta: ScrapeMeta;
  brand?: string;
  model?: string;
  title?: string;
  price?: PriceRange;
  bodyType?: string;
  fuelTypes: string[];
  transmissions: string[];
  seatingCapacity?: number;
  mileageKmpl?: number;
  engineCc?: number;
  maxPowerBhp?: number;
  maxTorqueNm?: number;
  rating?: Rating;
  description?: string;
  images: string[];
  variants: VariantSummary[];
  specifications: SpecGroups;
  features: string[];
}

export interface UsedCarListing {
  kind: 'used_car_listing';
  meta: ScrapeMeta;
  /** CarWale's own stock/listing id when it can be recovered from the URL. */
  listingId?: string;
  title?: string;
  brand?: string;
  model?: string;
  variant?: string;
  registrationYear?: number;
  manufactureYear?: number;
  price?: PriceRange;
  kilometresDriven?: number;
  fuelType?: string;
  transmission?: string;
  ownerCount?: number;
  registrationNumber?: string;
  insuranceValidTill?: string;
  city?: string;
  area?: string;
  sellerType?: string;
  sellerName?: string;
  certified?: boolean;
  images: string[];
  highlights: string[];
}

export interface DealerRecord {
  kind: 'dealer';
  meta: ScrapeMeta;
  name?: string;
  brand?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  rating?: Rating;
}

export interface ReviewRecord {
  kind: 'review';
  meta: ScrapeMeta;
  subject?: string;
  author?: string;
  publishedAt?: string;
  rating?: Rating;
  title?: string;
  body?: string;
}

export interface NewsArticle {
  kind: 'news_article';
  meta: ScrapeMeta;
  headline?: string;
  author?: string;
  publishedAt?: string;
  summary?: string;
  body?: string;
  tags: string[];
}

/**
 * A page the URL classifier could not place. Emitted rather than discarded so
 * that "what is on this site that we are not modelling yet?" is answerable
 * from the output of a crawl instead of requiring a second one.
 */
export interface UnclassifiedPage {
  kind: 'unclassified_page';
  meta: ScrapeMeta;
  title?: string;
  jsonLdTypes: string[];
}

export type ScrapeRecord =
  | NewCarModel
  | UsedCarListing
  | DealerRecord
  | ReviewRecord
  | NewsArticle
  | UnclassifiedPage;

export interface CrawlStats {
  startedAt: string;
  finishedAt?: string;
  requested: number;
  fetched: number;
  fromCache: number;
  failed: number;
  skippedByRobots: number;
  skippedDuplicate: number;
  emitted: Record<string, number>;
  bytesDownloaded: number;
}
