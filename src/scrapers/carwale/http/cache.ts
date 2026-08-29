import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * A plain on-disk response cache.
 *
 * Its purpose is development, not production throughput: tuning a selector
 * against a hundred saved pages should cost zero requests to the site. Entries
 * are keyed by URL hash and sharded two levels deep, because a full crawl can
 * produce hundreds of thousands of files and most filesystems degrade badly
 * with that many entries in one directory.
 */
export interface CachedResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  storedAt: number;
}

export class ResponseCache {
  constructor(
    private readonly dir: string,
    private readonly ttlMs: number,
  ) {}

  private pathFor(url: string): string {
    const hash = crypto.createHash('sha256').update(url).digest('hex');
    return path.join(this.dir, hash.slice(0, 2), hash.slice(2, 4), `${hash}.json`);
  }

  async get(url: string): Promise<CachedResponse | undefined> {
    try {
      const raw = await fs.readFile(this.pathFor(url), 'utf8');
      const entry = JSON.parse(raw) as CachedResponse;
      // ttlMs of 0 means "never expire" — useful for a frozen corpus.
      if (this.ttlMs > 0 && Date.now() - entry.storedAt > this.ttlMs) return undefined;
      return entry;
    } catch {
      return undefined;
    }
  }

  async set(entry: CachedResponse): Promise<void> {
    const file = this.pathFor(entry.url);
    await fs.mkdir(path.dirname(file), { recursive: true });
    // Write-then-rename: a crash mid-write leaves the old entry intact rather
    // than a truncated JSON file that would throw on every later read.
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entry), 'utf8');
    await fs.rename(tmp, file);
  }
}
