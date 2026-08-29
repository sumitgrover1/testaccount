import type { PriceRange, Rating, SpecGroups } from '../types';
import { absoluteUrl, cleanText, parseIndianPrice, parseNumber, type Dom, type Nodes } from './html';
import { unique } from '../util';

/** Reads a possibly-nested JSON-LD value: `brand` may be a string, an object or an array. */
export function jsonLdString(value: unknown, key = 'name'): string | undefined {
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = jsonLdString(item, key);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    return jsonLdString((value as Record<string, unknown>)[key], key);
  }
  return undefined;
}

/**
 * schema.org offers come as a single Offer, an AggregateOffer with
 * low/highPrice, or an array of Offers. All three appear on car sites, so all
 * three collapse to the same range here.
 */
export function priceFromJsonLd(node: Record<string, unknown> | undefined): PriceRange | undefined {
  if (!node) return undefined;
  const offers = node.offers;
  const candidates: Array<Record<string, unknown>> = [];
  if (Array.isArray(offers)) candidates.push(...(offers as Array<Record<string, unknown>>));
  else if (offers && typeof offers === 'object') candidates.push(offers as Record<string, unknown>);

  const values: number[] = [];
  for (const offer of candidates) {
    for (const key of ['price', 'lowPrice', 'highPrice']) {
      const raw = offer[key];
      const value = typeof raw === 'number' ? raw : parseNumber(String(raw ?? ''));
      if (value !== undefined && value > 0) values.push(value);
    }
  }
  if (!values.length) return undefined;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    label: cleanText(String(candidates[0]?.price ?? '')) || undefined,
    currency: 'INR',
  };
}

export function ratingFromJsonLd(node: Record<string, unknown> | undefined): Rating | undefined {
  const aggregate = node?.aggregateRating as Record<string, unknown> | undefined;
  if (!aggregate || typeof aggregate !== 'object') return undefined;
  const value = parseNumber(String(aggregate.ratingValue ?? ''));
  const count = parseNumber(String(aggregate.reviewCount ?? aggregate.ratingCount ?? ''));
  const best = parseNumber(String(aggregate.bestRating ?? ''));
  if (value === undefined && count === undefined) return undefined;
  return { value, count: count === undefined ? undefined : Math.round(count), best };
}

export function imagesFromJsonLd(node: Record<string, unknown> | undefined, base: string): string[] {
  if (!node) return [];
  const raw = node.image;
  const list = Array.isArray(raw) ? raw : [raw];
  return unique(
    list
      .map((item) =>
        typeof item === 'string'
          ? item
          : ((item as Record<string, unknown> | null)?.url as string | undefined),
      )
      .map((url) => absoluteUrl(base, url))
      .filter((url): url is string => Boolean(url)),
  );
}

/**
 * Image URLs from the DOM. Lazy-loaded galleries put the real URL in
 * `data-src`/`srcset` and a 1×1 placeholder in `src`, so checking `src` alone
 * collects nothing but spacers.
 */
export function collectImages($: Dom, selectors: string[], base: string, limit = 60): string[] {
  const urls: string[] = [];
  for (const selector of selectors) {
    $(selector).each((_i, el) => {
      const node = $(el);
      const candidate =
        node.attr('data-src') ??
        node.attr('data-lazy-src') ??
        node.attr('src') ??
        node.attr('srcset')?.split(',')[0]?.trim().split(/\s+/)[0];
      if (!candidate || candidate.startsWith('data:')) return;
      const resolved = absoluteUrl(base, candidate);
      if (resolved) urls.push(resolved);
    });
    if (urls.length) break;
  }
  return unique(urls).slice(0, limit);
}

export interface LabelledRowSelectors {
  row: string[];
  label: string[];
  value: string[];
}

/**
 * Pulls label/value pairs out of whatever a spec block turns out to be — a
 * table, a definition list or a list of divs. Falling back to splitting the
 * row's own text on ':' covers the layouts that carry no distinct label node
 * at all.
 */
export function readLabelledRows(
  $: Dom,
  container: Nodes | undefined,
  selectors: LabelledRowSelectors,
): Record<string, string> {
  const out: Record<string, string> = {};
  const scope: Nodes = container ?? $.root();

  for (const rowSelector of selectors.row) {
    const rows = scope.find(rowSelector);
    if (!rows.length) continue;

    rows.each((_i, el) => {
      const row = $(el);
      let label: string | undefined;
      let value: string | undefined;

      for (const labelSelector of selectors.label) {
        label = cleanText(row.find(labelSelector).first().text());
        if (label) break;
      }
      for (const valueSelector of selectors.value) {
        value = cleanText(row.find(valueSelector).first().text());
        if (value) break;
      }

      if (!label || !value || label === value) {
        const whole = cleanText(row.text());
        const colon = whole?.indexOf(':') ?? -1;
        if (whole && colon > 0) {
          label = cleanText(whole.slice(0, colon));
          value = cleanText(whole.slice(colon + 1));
        }
      }

      if (label && value && label !== value) out[label] = value;
    });

    if (Object.keys(out).length) break;
  }

  return out;
}

/** Case-insensitive lookup across every spec group, first pattern that matches wins. */
export function findSpec(groups: SpecGroups, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    for (const fields of Object.values(groups)) {
      for (const [label, value] of Object.entries(fields)) {
        if (pattern.test(label)) return value;
      }
    }
  }
  return undefined;
}

export const SPEC_PATTERNS = {
  mileage: [/\bmileage\b/i, /\barai\b/i, /km\s*\/\s*l/i, /fuel\s*efficiency/i],
  engine: [/engine\s*(?:displacement|capacity)/i, /displacement/i, /^engine$/i],
  power: [/max\.?\s*power/i, /\bpower\b/i, /\bbhp\b/i],
  torque: [/max\.?\s*torque/i, /\btorque\b/i],
  seating: [/seating\s*capacity/i, /\bseats?\b/i],
  fuel: [/fuel\s*type/i, /^fuel$/i],
  transmission: [/transmission/i, /gear\s*box/i],
  bodyType: [/body\s*(?:type|style)/i],
  owners: [/(?:no\.?\s*of\s*)?owners?/i, /ownership/i],
  kilometres: [/\bkms?\s*driven\b/i, /\bkilometres?\b/i, /\bodometer\b/i],
  year: [/(?:registration|make|manufactur\w*)\s*year/i, /^year$/i, /model\s*year/i],
  registration: [/registration\s*(?:number|no)/i, /\brto\b/i],
  insurance: [/insurance/i],
  city: [/\b(?:city|location)\b/i],
} satisfies Record<string, RegExp[]>;

export { parseIndianPrice };
