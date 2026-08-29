/**
 * Politeness gate shared by every worker.
 *
 * Two independent constraints are enforced together, because either alone is
 * insufficient: a concurrency semaphore caps how many sockets we hold open at
 * once, while a per-host spacing rule caps the *rate*. With concurrency alone,
 * N workers would fire N simultaneous requests the instant a page's links are
 * queued; with spacing alone, a slow response would let waits overlap into a
 * burst.
 */
export interface RateLimiterOptions {
  concurrency: number;
  minDelayMs: number;
  jitterMs?: number;
  /** Injectable for tests — the default is a real timer. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

// Deliberately not unref'd: a politeness wait is work in progress, and an
// unref'd timer lets Node exit mid-crawl the moment every worker happens to be
// waiting its turn rather than holding a socket open.
const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });

export class RateLimiter {
  private readonly concurrency: number;
  private readonly minDelayMs: number;
  private readonly jitterMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly random: () => number;

  private active = 0;
  private readonly waiters: Array<() => void> = [];
  /** Timestamp at which the next request to a given host may start. */
  private readonly nextAllowedAt = new Map<string, number>();
  /** Per-host delay floor raised by robots.txt Crawl-delay or a 429. */
  private readonly hostDelayOverride = new Map<string, number>();

  constructor(options: RateLimiterOptions) {
    this.concurrency = Math.max(1, options.concurrency);
    this.minDelayMs = Math.max(0, options.minDelayMs);
    this.jitterMs = Math.max(0, options.jitterMs ?? 0);
    this.sleep = options.sleep ?? realSleep;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
  }

  /**
   * Raise the floor for one host. Only ever raises: a site asking for a 10s
   * Crawl-delay must not be able to be talked down by config, but a config
   * that is already more polite than robots.txt stays in force.
   */
  setHostDelay(host: string, delayMs: number): void {
    const current = this.hostDelayOverride.get(host) ?? 0;
    if (delayMs > current) this.hostDelayOverride.set(host, delayMs);
  }

  getHostDelay(host: string): number {
    return Math.max(this.minDelayMs, this.hostDelayOverride.get(host) ?? 0);
  }

  /** Runs `fn` once a slot is free and the host's spacing has elapsed. */
  async schedule<T>(host: string, fn: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      await this.awaitHostTurn(host);
      return await fn();
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
  }

  private releaseSlot(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }

  private async awaitHostTurn(host: string): Promise<void> {
    const delay = this.getHostDelay(host) + this.random() * this.jitterMs;
    // The slot is reserved *before* sleeping, so two workers targeting the same
    // host queue up behind each other rather than both reading the same
    // `nextAllowedAt` and waking together.
    const earliest = this.nextAllowedAt.get(host) ?? 0;
    const startAt = Math.max(this.now(), earliest);
    this.nextAllowedAt.set(host, startAt + delay);
    const waitMs = startAt - this.now();
    if (waitMs > 0) await this.sleep(waitMs);
  }
}
