import crypto from 'crypto';

/**
 * JSON with object keys sorted at every level, so that two payloads carrying
 * the same facts hash identically regardless of the order the extractors
 * happened to fill them in. Without this, `contentHash` would change on every
 * crawl and change-detection would be useless.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return val;
  });
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function unique<T>(items: Iterable<T>): T[] {
  return [...new Set(items)];
}

/** Drops undefined, null and empty-string entries — keeps emitted JSON free of noise. */
export function compact<T>(items: Array<T | undefined | null | ''>): T[] {
  return items.filter((item): item is T => item !== undefined && item !== null && item !== '');
}
