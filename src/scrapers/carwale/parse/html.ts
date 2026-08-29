import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { PriceRange } from '../types';

export type Dom = cheerio.CheerioAPI;
/** A cheerio selection of any node type — the return of `$(sel)` and of `.find()` alike. */
export type Nodes = cheerio.Cheerio<AnyNode>;

export function loadHtml(html: string): Dom {
  return cheerio.load(html);
}

export function loadXml(xml: string): Dom {
  return cheerio.load(xml, { xmlMode: true });
}

/** Collapses the whitespace that pretty-printed HTML leaves inside text nodes. */
export function cleanText(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : undefined;
}

/**
 * Returns the text of the first selector in `selectors` that matches anything.
 * Selector lists are ordered best-guess-first: a site redesign usually breaks
 * the first entry while an older, more generic one still holds, and that keeps
 * a crawl producing partial data instead of nothing.
 */
export function textOf($: Dom, selectors: string[], root?: Nodes): string | undefined {
  for (const selector of selectors) {
    const node = root ? root.find(selector) : $(selector);
    const value = cleanText(node.first().text());
    if (value) return value;
  }
  return undefined;
}

export function attrOf($: Dom, selectors: string[], attribute: string): string | undefined {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr(attribute));
    if (value) return value;
  }
  return undefined;
}

export function absoluteUrl(base: string, href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

/**
 * Every JSON-LD block on the page, flattened: a `@graph` wrapper and a
 * top-level array are both common, and callers should not have to care which
 * shape a given page used.
 */
export function extractJsonLd($: Dom): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];

  const push = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(push);
      return;
    }
    const record = node as Record<string, unknown>;
    if (Array.isArray(record['@graph'])) {
      (record['@graph'] as unknown[]).forEach(push);
      return;
    }
    out.push(record);
  };

  $('script[type="application/ld+json"]').each((_i, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      push(JSON.parse(raw));
    } catch {
      // Publishers ship malformed JSON-LD often enough that one bad block must
      // not cost us the well-formed blocks alongside it.
    }
  });

  return out;
}

export function jsonLdTypes(nodes: Array<Record<string, unknown>>): string[] {
  const types = new Set<string>();
  for (const node of nodes) {
    const type = node['@type'];
    if (typeof type === 'string') types.add(type);
    else if (Array.isArray(type)) type.forEach((t) => typeof t === 'string' && types.add(t));
  }
  return [...types];
}

export function findJsonLd(
  nodes: Array<Record<string, unknown>>,
  wanted: string[],
): Record<string, unknown> | undefined {
  const want = new Set(wanted.map((w) => w.toLowerCase()));
  return nodes.find((node) => {
    const type = node['@type'];
    const list = typeof type === 'string' ? [type] : Array.isArray(type) ? type : [];
    return list.some((t) => typeof t === 'string' && want.has(t.toLowerCase()));
  });
}

/** Next.js hydration payload — when present it is richer and far more stable than the DOM. */
export function extractNextData($: Dom): Record<string, unknown> | undefined {
  const raw = $('#__NEXT_DATA__').contents().text();
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Recovers `window.__X__ = { ... };` style state blobs that server-rendered
 * pages inline. Brace-matching rather than a regex, because the payload
 * routinely contains `}` inside string values and a greedy/lazy regex gets
 * either far too much or far too little.
 */
export function extractEmbeddedJson(html: string, variableNames: string[]): Record<string, unknown> | undefined {
  for (const name of variableNames) {
    const marker = html.indexOf(name);
    if (marker === -1) continue;
    const start = html.indexOf('{', marker);
    if (start === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < html.length; i += 1) {
      const ch = html[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1)) as Record<string, unknown>;
          } catch {
            break;
          }
        }
      }
    }
  }
  return undefined;
}

/** Walks a nested object/array tree and yields every value whose key matches. */
export function collectByKey(node: unknown, key: string, out: unknown[] = []): unknown[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((child) => collectByKey(child, key, out));
    return out;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === key) out.push(v);
    collectByKey(v, key, out);
  }
  return out;
}

/**
 * Numeric parsers only ever need the start of a string, and a mis-aimed
 * selector can hand them an entire page body. Truncating first bounds the work
 * regardless of what the site serves.
 */
const MAX_NUMERIC_INPUT = 200;

function head(value: string): string {
  return value.length > MAX_NUMERIC_INPUT ? value.slice(0, MAX_NUMERIC_INPUT) : value;
}

const INDIAN_UNITS: Array<{ pattern: RegExp; multiplier: number }> = [
  { pattern: /\bcrores?\b|\bcr\b/i, multiplier: 1e7 },
  { pattern: /\blakhs?\b|\blacs?\b|\blakh\b/i, multiplier: 1e5 },
  { pattern: /\bthousands?\b/i, multiplier: 1e3 },
];

/**
 * Indian car prices are written as "₹ 6.49 - 9.14 Lakh" or "₹ 1.25 Crore" far
 * more often than in plain rupees, and the unit applies to *both* ends of a
 * range even though it is printed once. Returns rupees so that downstream
 * comparisons and sorts do not have to re-learn the convention.
 */
export function parseIndianPrice(input: string | undefined): PriceRange | undefined {
  const full = cleanText(input);
  if (!full) return undefined;
  const label = head(full);

  const numbers = (label.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map((token) => Number(token.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!numbers.length) return undefined;

  const unit = INDIAN_UNITS.find((u) => u.pattern.test(label));
  const multiplier = unit?.multiplier ?? 1;
  const scaled = numbers.map((n) => Math.round(n * multiplier));

  // A hyphen/en-dash between two figures is a range; anything else (a "2024"
  // in the label, a variant count) would poison max, so only the first two
  // numbers are considered and only when the text actually reads as a range.
  const isRange = /\d\s*(?:-|–|—|to)\s*\d/.test(label) && scaled.length >= 2;
  const min = scaled[0];
  const max = isRange ? scaled[1] : scaled[0];

  return { min, max: Math.max(min, max), label, currency: 'INR' };
}

/** First number in a string, commas stripped: "1,197 cc" -> 1197, "18.6 kmpl" -> 18.6. */
export function parseNumber(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const match = head(input).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

export function parseIntegerValue(input: string | undefined): number | undefined {
  const value = parseNumber(input);
  return value === undefined ? undefined : Math.round(value);
}

/**
 * Kilometres on a used-car card come as "45,000 km", "45k km" or "0.45 Lakh km".
 * The bare number is meaningless without resolving the suffix.
 */
export function parseKilometres(input: string | undefined): number | undefined {
  const text = cleanText(input);
  if (!text) return undefined;
  const value = parseNumber(head(text));
  if (value === undefined) return undefined;
  if (/\blakhs?\b|\blacs?\b/i.test(text)) return Math.round(value * 1e5);
  if (/\d\s*k\b/i.test(text)) return Math.round(value * 1e3);
  return Math.round(value);
}
