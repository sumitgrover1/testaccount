import fsp from 'fs/promises';
import path from 'path';
import type { ScraperConfig } from '../config';
import type { CrawlStats, RecordKind, ScrapeRecord } from '../types';
import type { Logger } from '../logger';
import { HttpClient } from '../http/client';
import { RateLimiter } from '../http/rate-limiter';
import { ResponseCache } from '../http/cache';
import { RobotsPolicy } from '../http/robots';
import { RecordWriter } from '../output/writer';
import { createPageContext, parsePage } from '../parse';
import { loadSelectors, type SelectorSet } from '../parse/selectors';
import { crawlSitemaps } from '../discover/sitemap';
import { Frontier } from './frontier';
import { loadCheckpoint, saveCheckpoint } from './checkpoint';
import { classifyUrl, extractLinks, isSameSite, looksLikeHtml, normalizeUrl } from './urls';
import { sha256 } from '../util';

export interface CrawlerOptions {
  config: ScraperConfig;
  logger: Logger;
  /** Restrict the crawl to these record kinds; other pages are fetched for links only. */
  onlyKinds?: RecordKind[];
  /** Seed the frontier from robots.txt-declared sitemaps before following links. */
  useSitemaps?: boolean;
  fetchImpl?: typeof fetch;
  /** Called for every emitted record — used by the CLI's single-URL mode. */
  onRecord?: (record: ScrapeRecord) => void;
}

const CHECKPOINT_EVERY = 50;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class Crawler {
  private readonly config: ScraperConfig;
  private readonly logger: Logger;
  private readonly selectors: SelectorSet;
  private readonly limiter: RateLimiter;
  private readonly client: HttpClient;
  private readonly robots: RobotsPolicy;
  private readonly frontier: Frontier;
  private readonly writer: RecordWriter;

  private stopping = false;
  private pagesFetched = 0;
  private sinceCheckpoint = 0;
  /** Pages being visited right now. A worker may only exit when this is zero. */
  private inFlight = 0;

  readonly stats: CrawlStats = {
    startedAt: new Date().toISOString(),
    requested: 0,
    fetched: 0,
    fromCache: 0,
    failed: 0,
    skippedByRobots: 0,
    skippedDuplicate: 0,
    emitted: {},
    bytesDownloaded: 0,
  };

  constructor(private readonly options: CrawlerOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.selectors = loadSelectors(this.config.selectorsFile);
    this.frontier = new Frontier(this.config.maxDepth);

    this.limiter = new RateLimiter({
      concurrency: this.config.concurrency,
      minDelayMs: this.config.minDelayMs,
      jitterMs: this.config.jitterMs,
    });

    this.client = new HttpClient({
      userAgent: this.config.userAgent,
      timeoutMs: this.config.requestTimeoutMs,
      maxRetries: this.config.maxRetries,
      retryBaseDelayMs: this.config.retryBaseDelayMs,
      retryMaxDelayMs: this.config.retryMaxDelayMs,
      rateLimiter: this.limiter,
      cache: this.config.cacheEnabled
        ? new ResponseCache(this.config.cacheDir, this.config.cacheTtlMs)
        : undefined,
      logger: this.logger,
      fetchImpl: options.fetchImpl,
      // Redirects are re-checked against robots.txt: a disallowed page reached
      // via an allowed redirect is still a disallowed page.
      onRedirect: async (_from, to) => !this.config.respectRobots || (await this.robots.isAllowed(to)).allowed,
    });

    this.robots = new RobotsPolicy(this.config.userAgent, async (url) => {
      const response = await this.client.get(url, { accept: 'text/plain,*/*;q=0.8' });
      return { status: response.status, body: response.body };
    });

    this.writer = new RecordWriter({
      outputDir: this.config.outputDir,
      format: this.config.outputFormat,
    });
  }

  /** Asks the crawl to wind down after in-flight requests finish. */
  stop(): void {
    this.stopping = true;
  }

  async run(seeds: string[]): Promise<CrawlStats> {
    await this.writer.init();

    if (this.config.resume) {
      const checkpoint = await loadCheckpoint(this.config.checkpointFile);
      if (checkpoint) {
        this.frontier.markSeen(checkpoint.visited);
        for (const item of checkpoint.pending) this.frontier.requeue(item);
        this.logger.info(
          { pending: checkpoint.pending.length, visited: checkpoint.visited.length },
          'resumed from checkpoint',
        );
      }
    }

    // robots.txt is read before anything else, both to obey it and because its
    // Crawl-delay and Sitemap lines configure the rest of the run.
    await this.applyCrawlDelay(this.config.baseUrl);

    if (this.options.useSitemaps) await this.seedFromSitemaps();

    for (const seed of seeds) {
      const url = normalizeUrl(seed, this.config.baseUrl);
      if (url) this.frontier.add({ url, depth: 0, kind: classifyUrl(url) });
    }

    this.logger.info(
      {
        seeds: this.frontier.pending,
        concurrency: this.config.concurrency,
        minDelayMs: this.config.minDelayMs,
        respectRobots: this.config.respectRobots,
      },
      'crawl starting',
    );

    const workers = Array.from({ length: this.config.concurrency }, () => this.worker());
    await Promise.all(workers);

    await this.persistCheckpoint();
    await this.writer.close();

    this.stats.finishedAt = new Date().toISOString();
    this.stats.emitted = { ...this.writer.counts };
    this.mergeClientStats();
    return this.stats;
  }

  private async worker(): Promise<void> {
    for (;;) {
      if (this.stopping) return;
      if (this.config.maxPages && this.pagesFetched >= this.config.maxPages) return;

      const item = this.frontier.next();
      if (!item) {
        // An empty queue does not mean the crawl is over: another worker may
        // be mid-fetch on a page whose links are about to refill it. Only when
        // nothing is in flight can this worker safely conclude there is no
        // more work coming.
        if (this.inFlight === 0) return;
        await delay(50);
        continue;
      }

      this.inFlight += 1;
      try {
        await this.visit(item.url, item.depth);
      } catch (err) {
        this.logger.warn({ url: item.url, err: (err as Error).message }, 'page failed');
      } finally {
        this.inFlight -= 1;
      }

      this.sinceCheckpoint += 1;
      if (this.sinceCheckpoint >= CHECKPOINT_EVERY) {
        this.sinceCheckpoint = 0;
        await this.persistCheckpoint();
      }
    }
  }

  private async visit(url: string, depth: number): Promise<void> {
    if (this.config.respectRobots) {
      const decision = await this.robots.isAllowed(url);
      if (!decision.allowed) {
        this.stats.skippedByRobots += 1;
        this.logger.debug({ url, rule: decision.rule }, 'skipped by robots.txt');
        return;
      }
    }

    const response = await this.client.get(url);
    this.pagesFetched += 1;

    if (response.status >= 400) {
      this.logger.warn({ url, status: response.status }, 'non-success response');
      return;
    }

    const contentType = response.headers['content-type'] ?? '';
    if (contentType && !/html|xml|json/i.test(contentType)) {
      this.logger.debug({ url, contentType }, 'skipping non-document response');
      return;
    }

    if (this.config.saveRawHtml) await this.saveHtml(url, response.body);

    const kind = classifyUrl(response.finalUrl);
    const ctx = createPageContext({
      url,
      finalUrl: response.finalUrl,
      status: response.status,
      depth,
      html: response.body,
      selectors: this.selectors,
    });

    const wanted = !this.options.onlyKinds || this.options.onlyKinds.includes(kind);
    if (wanted) {
      for (const record of parsePage(kind, ctx)) {
        await this.writer.write(record);
        this.options.onRecord?.(record);
      }
    }

    // Links are followed even from pages we did not emit: an index page is
    // worthless as a record and essential as a route to the detail pages.
    const links = extractLinks(ctx.$, response.finalUrl, this.config.baseUrl, {
      ignoredContainers: this.selectors.common.ignoredLinkContainers,
    });
    for (const link of links) {
      if (!isSameSite(link.url, this.config.baseUrl) || !looksLikeHtml(link.url)) continue;
      if (!this.frontier.add({ url: link.url, depth: depth + 1, kind: link.kind })) {
        this.stats.skippedDuplicate += 1;
      }
    }
  }

  private async seedFromSitemaps(): Promise<void> {
    const origin = new URL(this.config.baseUrl).origin;
    const declared = await this.robots.sitemaps(origin);
    // Fall back to the conventional location when robots.txt names none.
    const roots = declared.length ? declared : [`${origin}/sitemap.xml`];

    const entries = await crawlSitemaps(roots, {
      client: this.client,
      logger: this.logger,
      maxUrls: this.config.maxPages || 0,
    });

    let added = 0;
    for (const entry of entries) {
      if (!isSameSite(entry.url, this.config.baseUrl) || !looksLikeHtml(entry.url)) continue;
      // Sitemap URLs are seeds, not discoveries: at depth 0 they are not
      // subject to maxDepth, which is about how far to follow *links*.
      if (this.frontier.add({ url: entry.url, depth: 0, kind: classifyUrl(entry.url) })) added += 1;
    }
    this.logger.info({ roots: roots.length, discovered: entries.length, added }, 'sitemaps seeded');
  }

  private async applyCrawlDelay(url: string): Promise<void> {
    if (!this.config.honourCrawlDelay) return;
    const delay = await this.robots.crawlDelayMs(url);
    if (delay === undefined) return;
    const host = new URL(url).host;
    // setHostDelay only ever raises the floor, so a Crawl-delay shorter than
    // our configured pace does not license us to speed up.
    this.limiter.setHostDelay(host, delay);
    this.logger.info({ host, crawlDelayMs: delay }, 'applying robots.txt Crawl-delay');
  }

  private async saveHtml(url: string, html: string): Promise<void> {
    const dir = path.join(this.config.outputDir, 'raw');
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, `${sha256(url).slice(0, 32)}.html`), html, 'utf8');
  }

  private async persistCheckpoint(): Promise<void> {
    this.mergeClientStats();
    const pending = this.frontier.drainAll();
    await saveCheckpoint(this.config.checkpointFile, {
      version: 1,
      baseUrl: this.config.baseUrl,
      savedAt: new Date().toISOString(),
      visited: this.frontier.seenKeys(),
      pending,
      stats: { ...this.stats, emitted: { ...this.writer.counts } },
    });
    // drainAll() empties the queue to snapshot it, so put the items back.
    for (const item of pending) this.frontier.requeue(item);
  }

  private mergeClientStats(): void {
    this.stats.requested = this.client.stats.requested;
    this.stats.fetched = this.client.stats.fetched;
    this.stats.fromCache = this.client.stats.fromCache;
    this.stats.failed = this.client.stats.failed;
    this.stats.bytesDownloaded = this.client.stats.bytesDownloaded;
  }
}
