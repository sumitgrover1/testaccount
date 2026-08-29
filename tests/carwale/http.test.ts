import { HttpClient, HttpError, parseRetryAfter } from '../../src/scrapers/carwale/http/client';
import { RateLimiter } from '../../src/scrapers/carwale/http/rate-limiter';
import { logger } from '../../src/scrapers/carwale/logger';

const response = (
  status: number,
  body = '',
  headers: Record<string, string> = {},
): Response => new Response(body, { status, headers });

const client = (fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}): HttpClient =>
  new HttpClient({
    userAgent: 'test-agent/1.0',
    timeoutMs: 1000,
    maxRetries: 2,
    retryBaseDelayMs: 1,
    retryMaxDelayMs: 10,
    rateLimiter: new RateLimiter({ concurrency: 4, minDelayMs: 0 }),
    logger,
    fetchImpl,
    sleep: async () => undefined,
    ...overrides,
  });

describe('parseRetryAfter', () => {
  it('reads delta-seconds and HTTP dates', () => {
    expect(parseRetryAfter('30')).toBe(30_000);
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:10 GMT', now)).toBe(10_000);
  });

  it('ignores a header it cannot understand', () => {
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });
});

describe('HttpClient', () => {
  it('sends the configured user-agent', async () => {
    const fetchImpl = jest.fn(async () => response(200, 'ok'));
    await client(fetchImpl as unknown as typeof fetch).get('https://a.test/x');
    const headers = (fetchImpl.mock.calls[0] as unknown[])[1] as RequestInit;
    expect((headers.headers as Record<string, string>)['user-agent']).toBe('test-agent/1.0');
  });

  it('retries a 503 and returns the eventual success', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200, 'body'));
    const result = await client(fetchImpl as unknown as typeof fetch).get('https://a.test/x');
    expect(result.status).toBe(200);
    expect(result.body).toBe('body');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries a network error and gives up after maxRetries', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    const instance = client(fetchImpl as unknown as typeof fetch);
    await expect(instance.get('https://a.test/x')).rejects.toBeInstanceOf(HttpError);
    // One initial attempt plus maxRetries.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(instance.stats.failed).toBe(1);
  });

  it('does not retry a 404', async () => {
    const fetchImpl = jest.fn(async () => response(404));
    const result = await client(fetchImpl as unknown as typeof fetch).get('https://a.test/x');
    expect(result.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('slows the whole host down after a 429 rather than only the retry', async () => {
    const limiter = new RateLimiter({ concurrency: 1, minDelayMs: 100 });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(response(429, '', { 'retry-after': '1' }))
      .mockResolvedValueOnce(response(200, 'ok'));
    await client(fetchImpl as unknown as typeof fetch, { rateLimiter: limiter }).get(
      'https://a.test/x',
    );
    expect(limiter.getHostDelay('a.test')).toBeGreaterThan(100);
  });

  it('follows redirects and reports where it landed', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(response(301, '', { location: '/moved/' }))
      .mockResolvedValueOnce(response(200, 'final'));
    const result = await client(fetchImpl as unknown as typeof fetch).get('https://a.test/old');
    expect(result.body).toBe('final');
    expect(fetchImpl.mock.calls[1][0]).toBe('https://a.test/moved/');
    // `url` stays the requested URL so callers can key on what they asked for.
    expect(result.url).toBe('https://a.test/old');
  });

  it('refuses a redirect the policy hook rejects, without retrying it', async () => {
    const fetchImpl = jest.fn(async () => response(302, '', { location: '/private/' }));
    const onRedirect = jest.fn(() => false);
    await expect(
      client(fetchImpl as unknown as typeof fetch, { onRedirect }).get('https://a.test/x'),
    ).rejects.toThrow(/refused by policy/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('stops after too many redirect hops', async () => {
    const fetchImpl = jest.fn(async () => response(302, '', { location: '/loop/' }));
    await expect(
      client(fetchImpl as unknown as typeof fetch).get('https://a.test/loop/'),
    ).rejects.toThrow(/redirects/);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(
      client(fetchImpl as unknown as typeof fetch, { timeoutMs: 5, maxRetries: 0 }).get(
        'https://a.test/slow',
      ),
    ).rejects.toThrow(/aborted/);
  });

  it('serves a repeat request from the cache without touching the network', async () => {
    const store = new Map<string, unknown>();
    const cache = {
      get: async (url: string) => store.get(url),
      set: async (entry: { url: string }) => {
        store.set(entry.url, entry);
      },
    };
    const fetchImpl = jest.fn(async () => response(200, 'cached body'));
    const instance = client(fetchImpl as unknown as typeof fetch, { cache });

    await instance.get('https://a.test/x');
    const second = await instance.get('https://a.test/x');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.fromCache).toBe(true);
    expect(second.body).toBe('cached body');
    expect(instance.stats.fromCache).toBe(1);
  });
});

describe('RateLimiter', () => {
  it('never exceeds the configured concurrency', async () => {
    const limiter = new RateLimiter({ concurrency: 2, minDelayMs: 0 });
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 8 }, () =>
        limiter.schedule('a.test', async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
        }),
      ),
    );

    expect(peak).toBe(2);
  });

  it('spaces consecutive requests to the same host by the minimum delay', async () => {
    const waits: number[] = [];
    let clock = 0;
    const limiter = new RateLimiter({
      concurrency: 4,
      minDelayMs: 1000,
      jitterMs: 0,
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });

    await limiter.schedule('a.test', async () => undefined);
    await limiter.schedule('a.test', async () => undefined);
    await limiter.schedule('a.test', async () => undefined);

    expect(waits).toEqual([1000, 1000]);
  });

  it('keeps hosts independent of one another', async () => {
    const waits: number[] = [];
    const limiter = new RateLimiter({
      concurrency: 4,
      minDelayMs: 1000,
      jitterMs: 0,
      now: () => 0,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });

    await limiter.schedule('a.test', async () => undefined);
    await limiter.schedule('b.test', async () => undefined);

    expect(waits).toEqual([]);
  });

  it('uses a ref-ed timer so a politeness wait cannot let the process exit', async () => {
    // Regression guard: with an unref'd timer, a crawl whose workers are all
    // waiting their turn holds no ref-ed handle, and Node exits mid-run —
    // which no in-process test notices, because the test runner itself keeps
    // the loop alive.
    const spy = jest.spyOn(global, 'setTimeout');
    const limiter = new RateLimiter({ concurrency: 1, minDelayMs: 20, jitterMs: 0 });
    await limiter.schedule('a.test', async () => undefined);
    await limiter.schedule('a.test', async () => undefined);

    const timers = spy.mock.results.map((result) => result.value as NodeJS.Timeout);
    expect(timers.length).toBeGreaterThan(0);
    expect(timers.every((timer) => timer.hasRef())).toBe(true);
    spy.mockRestore();
  });

  it('only ever raises a host delay, never lowers it', () => {
    const limiter = new RateLimiter({ concurrency: 1, minDelayMs: 500 });
    limiter.setHostDelay('a.test', 5000);
    limiter.setHostDelay('a.test', 100);
    expect(limiter.getHostDelay('a.test')).toBe(5000);
    // The configured minimum still applies to a host with no override.
    expect(limiter.getHostDelay('b.test')).toBe(500);
  });
});
