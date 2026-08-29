import { z } from 'zod';

/**
 * Scraper configuration.
 *
 * The defaults here are deliberately conservative — one request at a time per
 * host with a one-second gap — because the polite ceiling is a property of the
 * *target*, not of what this machine can push. Raising `concurrency` or
 * dropping `minDelayMs` is a decision about the load you are willing to place
 * on someone else's servers; make it consciously, and prefer running for
 * longer over running harder.
 */
export const scraperConfigSchema = z.object({
  /** Origin to crawl. Overridable so the suite can run against a local fixture server. */
  baseUrl: z.string().url().default('https://www.carwale.com'),

  /**
   * Identify the crawler honestly and give the site owner a way to reach you.
   * A contact URL/e-mail in the UA is what turns an unexplained traffic spike
   * into an e-mail instead of a blanket IP ban.
   */
  userAgent: z
    .string()
    .min(1)
    .default('carwale-scraper/1.0 (+set CARWALE_CONTACT to your contact URL or e-mail)'),

  /** Requests in flight at any moment, across the whole crawl. */
  concurrency: z.coerce.number().int().min(1).max(16).default(2),
  /** Floor on the gap between two consecutive requests to the same host. */
  minDelayMs: z.coerce.number().int().min(0).default(1000),
  /** Random extra delay in [0, jitterMs) added to every gap, to avoid a metronomic pattern. */
  jitterMs: z.coerce.number().int().min(0).default(400),

  requestTimeoutMs: z.coerce.number().int().positive().default(30_000),
  maxRetries: z.coerce.number().int().min(0).max(10).default(3),
  retryBaseDelayMs: z.coerce.number().int().positive().default(1000),
  /** Ceiling on a single backoff wait, so a Retry-After of 3600 cannot stall the run. */
  retryMaxDelayMs: z.coerce.number().int().positive().default(60_000),

  /** Stop after this many successfully fetched pages. 0 means no limit. */
  maxPages: z.coerce.number().int().min(0).default(0),
  /** Link depth from the seeds. 0 crawls the seeds only. */
  maxDepth: z.coerce.number().int().min(0).default(3),

  /**
   * When false the crawler still *reads* robots.txt and logs what it would
   * have skipped, but does not enforce it. Left as an explicit switch because
   * there are legitimate cases (crawling a site you own, a contractual data
   * feed) — it should never be flipped casually for a third-party site.
   */
  respectRobots: z.boolean().default(true),
  /** Ignore a robots.txt Crawl-delay lower than our own minDelayMs, never higher. */
  honourCrawlDelay: z.boolean().default(true),

  outputDir: z.string().default('./carwale-data'),
  outputFormat: z.enum(['jsonl', 'csv', 'both']).default('jsonl'),

  /** On-disk HTTP cache — makes selector development free of extra requests. */
  cacheEnabled: z.boolean().default(true),
  cacheDir: z.string().default('./.carwale-cache'),
  cacheTtlMs: z.coerce.number().int().min(0).default(24 * 60 * 60 * 1000),

  /** Persist raw HTML next to the records. Large, but the only way to debug a bad parse after the fact. */
  saveRawHtml: z.boolean().default(false),

  /** Path to a JSON file overriding the built-in CSS selectors. See parse/selectors.ts. */
  selectorsFile: z.string().optional(),

  checkpointFile: z.string().default('./.carwale-checkpoint.json'),
  resume: z.boolean().default(false),

  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

export type ScraperConfig = z.infer<typeof scraperConfigSchema>;

/**
 * Fields a caller may override; everything else falls back to the schema
 * defaults. The numeric fields also accept strings because their two real
 * sources — CLI flags and environment variables — only ever produce strings;
 * `z.coerce` converts them and reports a clear error on garbage.
 */
type NumericField =
  | 'concurrency'
  | 'minDelayMs'
  | 'jitterMs'
  | 'requestTimeoutMs'
  | 'maxRetries'
  | 'retryBaseDelayMs'
  | 'retryMaxDelayMs'
  | 'maxPages'
  | 'maxDepth'
  | 'cacheTtlMs';

export type ScraperConfigInput = Partial<
  Omit<z.input<typeof scraperConfigSchema>, NumericField> & Record<NumericField, number | string>
>;

function envOverrides(): ScraperConfigInput {
  const e = process.env;
  const contact = e.CARWALE_CONTACT;
  return stripUndefined({
    baseUrl: e.CARWALE_BASE_URL,
    userAgent: e.CARWALE_USER_AGENT ?? (contact ? `carwale-scraper/1.0 (+${contact})` : undefined),
    concurrency: e.CARWALE_CONCURRENCY,
    minDelayMs: e.CARWALE_MIN_DELAY_MS,
    requestTimeoutMs: e.CARWALE_REQUEST_TIMEOUT_MS,
    maxPages: e.CARWALE_MAX_PAGES,
    maxDepth: e.CARWALE_MAX_DEPTH,
    outputDir: e.CARWALE_OUTPUT_DIR,
    cacheDir: e.CARWALE_CACHE_DIR,
    selectorsFile: e.CARWALE_SELECTORS_FILE,
    logLevel: e.CARWALE_LOG_LEVEL as ScraperConfigInput['logLevel'],
  });
}

function stripUndefined(obj: Record<string, unknown>): ScraperConfigInput {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''),
  ) as ScraperConfigInput;
}

/**
 * Precedence: explicit argument > environment > schema default. CLI flags are
 * parsed into `overrides`, so a flag always wins over a stale shell export.
 */
export function loadConfig(overrides: ScraperConfigInput = {}): ScraperConfig {
  return scraperConfigSchema.parse({ ...envOverrides(), ...stripUndefined(overrides) });
}
