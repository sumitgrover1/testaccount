import zlib from 'zlib';
import { promisify } from 'util';
import type { Logger } from '../logger';
import type { ResponseCache } from './cache';
import type { RateLimiter } from './rate-limiter';

const gunzip = promisify(zlib.gunzip);

export interface FetchResult {
  /** The URL as requested, before any redirect. */
  url: string;
  /** Where the request actually landed. Differs from `url` when redirected. */
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  fromCache: boolean;
  bytes: number;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
    readonly attempts?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface HttpClientOptions {
  userAgent: string;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  rateLimiter: RateLimiter;
  cache?: ResponseCache;
  logger: Logger;
  /** Injected in tests; defaults to the platform fetch. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /**
   * Consulted before each redirect hop. Returning false aborts the chain —
   * this is how the crawler keeps robots.txt applying to redirect *targets*,
   * not just to the URL it originally queued.
   */
  onRedirect?: (from: string, to: string) => Promise<boolean> | boolean;
}

export interface GetOptions {
  /** Skip the cache for this request (used when re-fetching a page that failed to parse). */
  noCache?: boolean;
  /** Gunzip the body before decoding — for `.xml.gz` sitemaps, which are gzip *content*, not gzip transfer-encoding. */
  decompress?: boolean;
  maxRedirects?: number;
  accept?: string;
}

/** 408/425/429 and 5xx are transient by definition; everything else is the server's final answer. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);

export class HttpClient {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  readonly stats = { requested: 0, fetched: 0, fromCache: 0, failed: 0, bytesDownloaded: 0 };

  constructor(private readonly options: HttpClientOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    // Not unref'd — see the note in rate-limiter.ts: a backoff wait must keep
    // the process alive, or a retry schedule silently becomes an early exit.
    this.sleep =
      options.sleep ??
      ((ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        }));
    this.random = options.random ?? Math.random;
  }

  async get(url: string, opts: GetOptions = {}): Promise<FetchResult> {
    this.stats.requested += 1;

    if (this.options.cache && !opts.noCache) {
      const hit = await this.options.cache.get(url);
      if (hit) {
        this.stats.fromCache += 1;
        return {
          url,
          finalUrl: hit.url,
          status: hit.status,
          headers: hit.headers,
          body: hit.body,
          fromCache: true,
          bytes: Buffer.byteLength(hit.body),
        };
      }
    }

    const result = await this.getWithRedirects(url, opts);

    if (this.options.cache && result.status < 400) {
      await this.options.cache.set({
        url,
        status: result.status,
        headers: result.headers,
        body: result.body,
        storedAt: Date.now(),
      });
    }

    return result;
  }

  private async getWithRedirects(url: string, opts: GetOptions): Promise<FetchResult> {
    const maxRedirects = opts.maxRedirects ?? 5;
    let current = url;

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const response = await this.getWithRetries(current, opts);
      const location = response.headers.location;
      if (response.status < 300 || response.status >= 400 || !location) {
        return { ...response, url };
      }

      const target = new URL(location, current).toString();
      if (this.options.onRedirect && !(await this.options.onRedirect(current, target))) {
        throw new HttpError(`Redirect to ${target} refused by policy`, url, response.status);
      }
      this.options.logger.debug({ from: current, to: target }, 'following redirect');
      current = target;
    }

    throw new HttpError(`Exceeded ${maxRedirects} redirects`, url);
  }

  private async getWithRetries(url: string, opts: GetOptions): Promise<FetchResult> {
    const host = new URL(url).host;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        const result = await this.options.rateLimiter.schedule(host, () =>
          this.performRequest(url, opts),
        );

        if (!RETRYABLE_STATUS.has(result.status)) {
          this.stats.fetched += 1;
          this.stats.bytesDownloaded += result.bytes;
          return result;
        }

        if (result.status === 429) {
          // A 429 is the site telling us our configured pace is too fast. Slow
          // the whole host down for the rest of the run, not just this retry —
          // otherwise every worker keeps rediscovering the same limit.
          const current = this.options.rateLimiter.getHostDelay(host);
          this.options.rateLimiter.setHostDelay(host, Math.min(current * 2 || 1000, 60_000));
        }

        lastError = new HttpError(`HTTP ${result.status}`, url, result.status, attempt + 1);
        if (attempt === this.options.maxRetries) break;
        await this.backoff(attempt, result.headers['retry-after']);
      } catch (err) {
        // AbortError (our timeout) and socket errors land here and are retried;
        // a policy refusal from onRedirect is final and must not be.
        if (err instanceof HttpError && err.message.includes('refused by policy')) throw err;
        lastError = err as Error;
        if (attempt === this.options.maxRetries) break;
        this.options.logger.debug({ url, attempt, err }, 'request failed, retrying');
        await this.backoff(attempt);
      }
    }

    this.stats.failed += 1;
    throw new HttpError(
      `GET ${url} failed after ${this.options.maxRetries + 1} attempts: ${lastError?.message}`,
      url,
      lastError instanceof HttpError ? lastError.status : undefined,
      this.options.maxRetries + 1,
    );
  }

  private async performRequest(url: string, opts: GetOptions): Promise<FetchResult> {
    const controller = new AbortController();
    // The watchdog *is* unref'd: the in-flight request holds the loop open on
    // its own, and the timer should never be the reason the process lingers.
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    timer.unref?.();

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': this.options.userAgent,
          accept: opts.accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-IN,en;q=0.9',
          'accept-encoding': 'gzip, deflate, br',
        },
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      // A redirect body is never useful, and draining it costs a round trip.
      if (response.status >= 300 && response.status < 400 && headers.location) {
        return { url, finalUrl: url, status: response.status, headers, body: '', fromCache: false, bytes: 0 };
      }

      const raw = Buffer.from(await response.arrayBuffer());
      const body = opts.decompress ? (await gunzip(raw)).toString('utf8') : raw.toString('utf8');

      return {
        url,
        finalUrl: response.url || url,
        status: response.status,
        headers,
        body,
        fromCache: false,
        bytes: raw.byteLength,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Exponential backoff with full jitter. Jitter is not cosmetic: without it,
   * every worker that hit the same 503 retries in lockstep and re-creates the
   * burst that caused it.
   */
  private async backoff(attempt: number, retryAfter?: string): Promise<void> {
    const parsed = parseRetryAfter(retryAfter);
    const exponential = this.options.retryBaseDelayMs * 2 ** attempt;
    const wait = Math.min(
      parsed ?? Math.round(this.random() * exponential) + this.options.retryBaseDelayMs,
      this.options.retryMaxDelayMs,
    );
    await this.sleep(wait);
  }
}

/** Retry-After is either delta-seconds or an HTTP date; both are in the wild. */
export function parseRetryAfter(value: string | undefined, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}
