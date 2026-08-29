import type { RecordKind } from '../types';
import { dedupeKey } from './urls';

export interface FrontierItem {
  url: string;
  depth: number;
  kind: RecordKind;
}

/**
 * Higher runs first. Detail pages outrank index pages so that a crawl cut
 * short by `--max-pages` (or by an interrupt) has spent its budget on records
 * rather than on pagination it never got to follow.
 */
const KIND_PRIORITY: Record<RecordKind, number> = {
  new_car_model: 40,
  used_car_listing: 35,
  dealer: 30,
  review: 25,
  news_article: 20,
  unclassified_page: 10,
};

/**
 * The URL queue and the visited set.
 *
 * De-duplication happens on `dedupeKey`, not on the raw URL, so `/swift` and
 * `/swift/` are one page. `visited` is marked at *enqueue* time rather than at
 * fetch time — with several workers pulling concurrently, marking on fetch
 * lets the same URL be queued N times before the first one completes.
 */
export class Frontier {
  private readonly buckets = new Map<number, FrontierItem[]>();
  private readonly seen = new Set<string>();
  private size = 0;

  constructor(private readonly maxDepth: number) {}

  add(item: FrontierItem): boolean {
    if (item.depth > this.maxDepth) return false;
    const key = dedupeKey(item.url);
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.push(item);
    return true;
  }

  /** Re-queues an item that failed transiently, without re-checking the visited set. */
  requeue(item: FrontierItem): void {
    this.push(item);
  }

  private push(item: FrontierItem): void {
    const priority = KIND_PRIORITY[item.kind] ?? 0;
    const bucket = this.buckets.get(priority);
    if (bucket) bucket.push(item);
    else this.buckets.set(priority, [item]);
    this.size += 1;
  }

  next(): FrontierItem | undefined {
    const priorities = [...this.buckets.keys()].sort((a, b) => b - a);
    for (const priority of priorities) {
      const bucket = this.buckets.get(priority);
      const item = bucket?.shift();
      if (item) {
        this.size -= 1;
        return item;
      }
      this.buckets.delete(priority);
    }
    return undefined;
  }

  get pending(): number {
    return this.size;
  }

  get visitedCount(): number {
    return this.seen.size;
  }

  /** Snapshot for the checkpoint file. */
  drainAll(): FrontierItem[] {
    const items: FrontierItem[] = [];
    let item = this.next();
    while (item) {
      items.push(item);
      item = this.next();
    }
    return items;
  }

  markSeen(keys: Iterable<string>): void {
    for (const key of keys) this.seen.add(key);
  }

  seenKeys(): string[] {
    return [...this.seen];
  }
}
