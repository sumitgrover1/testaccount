import type { ExtractionStrategy, ScrapeMeta } from '../types';
import type { SelectorSet } from './selectors';
import { loadHtml, type Dom, extractJsonLd, extractNextData, cleanText } from './html';
import { sha256, stableStringify } from '../util';

/**
 * Everything a parser needs about one fetched page, with the expensive work
 * (DOM construction, JSON-LD parsing) done once and shared. Parsers are pure
 * functions of this object, which is what makes them testable against a saved
 * HTML fixture with no network and no crawler.
 */
export interface PageContext {
  url: string;
  finalUrl: string;
  status: number;
  depth: number;
  html: string;
  $: Dom;
  jsonLd: Array<Record<string, unknown>>;
  nextData?: Record<string, unknown>;
  selectors: SelectorSet;
}

export function createPageContext(input: {
  url: string;
  finalUrl?: string;
  status: number;
  depth?: number;
  html: string;
  selectors: SelectorSet;
}): PageContext {
  const $ = loadHtml(input.html);
  return {
    url: input.url,
    finalUrl: input.finalUrl ?? input.url,
    status: input.status,
    depth: input.depth ?? 0,
    html: input.html,
    $,
    jsonLd: extractJsonLd($),
    nextData: extractNextData($),
    selectors: input.selectors,
  };
}

/**
 * `payload` is the record without its meta block; hashing it (and not the raw
 * HTML) is what makes `contentHash` a change signal for the *data* rather than
 * for the ads and nonces that differ on every response.
 */
export function buildMeta(
  ctx: PageContext,
  strategies: ExtractionStrategy[],
  payload: unknown,
): ScrapeMeta {
  const canonical = cleanText(ctx.$(ctx.selectors.common.canonical.join(',')).first().attr('href'));
  return {
    url: ctx.url,
    canonicalUrl: canonical,
    fetchedAt: new Date().toISOString(),
    httpStatus: ctx.status,
    strategies,
    contentHash: sha256(stableStringify(payload)),
    depth: ctx.depth,
  };
}

/** Records which extractors actually contributed, in run order and without duplicates. */
export class StrategyLog {
  private readonly used: ExtractionStrategy[] = [];

  mark(strategy: ExtractionStrategy): void {
    if (!this.used.includes(strategy)) this.used.push(strategy);
  }

  /** Marks the strategy only when the value is actually present. */
  take<T>(strategy: ExtractionStrategy, value: T | undefined): T | undefined {
    if (value !== undefined && value !== null && value !== '') this.mark(strategy);
    return value;
  }

  list(): ExtractionStrategy[] {
    return [...this.used];
  }
}
