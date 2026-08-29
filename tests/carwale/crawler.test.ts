import fsp from 'fs/promises';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Crawler } from '../../src/scrapers/carwale/crawl/crawler';
import { loadConfig } from '../../src/scrapers/carwale/config';
import { logger } from '../../src/scrapers/carwale/logger';

const fixture = (name: string): string =>
  fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

const ROBOTS = `User-agent: *
Disallow: /private/
Crawl-delay: 0

Sitemap: https://example.test/sitemap.xml
`;

const HOME = `<html><body><main>
  <a href="/maruti-cars/swift/">Swift</a>
  <a href="/used/cars-in-pune/swift-2018-d123456/">Used Swift</a>
  <a href="/private/secret/">Members only</a>
  <a href="/news/launch-story/">Launch story</a>
</main></body></html>`;

const NEWS = `<html><head>
  <script type="application/ld+json">
    {"@type":"NewsArticle","headline":"Swift facelift launched","author":{"name":"A Reporter"},
     "datePublished":"2026-02-01","articleBody":"Body text."}
  </script></head><body><h1>Swift facelift launched</h1></body></html>`;

const SITEMAP = `<urlset><url><loc>https://example.test/hyundai-cars/i20/</loc></url></urlset>`;

const I20 = `<html><head>
  <script type="application/ld+json">
    {"@type":"Car","name":"Hyundai i20","brand":{"name":"Hyundai"},
     "offers":{"@type":"AggregateOffer","lowPrice":700000,"highPrice":1100000}}
  </script></head><body><h1>Hyundai i20</h1></body></html>`;

const SITE: Record<string, { status?: number; body: string; type?: string }> = {
  'https://example.test/robots.txt': { body: ROBOTS, type: 'text/plain' },
  'https://example.test/': { body: HOME },
  'https://example.test/sitemap.xml': { body: SITEMAP, type: 'application/xml' },
  'https://example.test/maruti-cars/swift/': { body: fixture('new-car-model.html') },
  'https://example.test/used/cars-in-pune/swift-2018-d123456/': {
    body: fixture('used-car-listing.html'),
  },
  'https://example.test/news/launch-story/': { body: NEWS },
  'https://example.test/hyundai-cars/i20/': { body: I20 },
  'https://example.test/private/secret/': { body: '<html><body>secret</body></html>' },
};

describe('Crawler (end to end against a simulated site)', () => {
  let outputDir: string;
  let requested: string[];
  let fetchImpl: jest.Mock;

  const readRecords = async (kind: string): Promise<Array<Record<string, never>>> => {
    const file = path.join(outputDir, `${kind}.jsonl`);
    try {
      const body = await fsp.readFile(file, 'utf8');
      return body
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  };

  const makeConfig = async (overrides: Record<string, unknown> = {}) =>
    loadConfig({
      baseUrl: 'https://example.test',
      outputDir,
      cacheEnabled: false,
      minDelayMs: 0,
      jitterMs: 0,
      concurrency: 2,
      checkpointFile: path.join(outputDir, 'checkpoint.json'),
      logLevel: 'silent',
      ...overrides,
    });

  beforeEach(async () => {
    outputDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'carwale-crawl-'));
    requested = [];
    fetchImpl = jest.fn(async (url: string) => {
      requested.push(url);
      const page = SITE[url];
      if (!page) return new Response('not found', { status: 404 });
      return new Response(page.body, {
        status: page.status ?? 200,
        headers: { 'content-type': page.type ?? 'text/html; charset=utf-8' },
      });
    });
  });

  it('crawls the site, emits one file per record kind and obeys robots.txt', async () => {
    const crawler = new Crawler({
      config: await makeConfig(),
      logger,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const stats = await crawler.run(['https://example.test/']);

    const models = await readRecords('new_car_model');
    const used = await readRecords('used_car_listing');
    const news = await readRecords('news_article');

    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({ brand: 'Maruti Suzuki', model: 'Swift' });
    expect(used).toHaveLength(1);
    expect(used[0]).toMatchObject({ listingId: '123456', kilometresDriven: 45_000 });
    expect(news).toHaveLength(1);
    expect(news[0]).toMatchObject({ headline: 'Swift facelift launched' });

    // The disallowed page is never requested, and the skip is counted.
    expect(requested).not.toContain('https://example.test/private/secret/');
    expect(stats.skippedByRobots).toBe(1);
    expect(stats.emitted.new_car_model).toBe(1);
  });

  it('fetches robots.txt once for the whole crawl', async () => {
    const crawler = new Crawler({
      config: await makeConfig(),
      logger,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await crawler.run(['https://example.test/']);
    expect(requested.filter((url) => url.endsWith('/robots.txt'))).toHaveLength(1);
  });

  it('crawls the disallowed page when robots enforcement is turned off', async () => {
    const crawler = new Crawler({
      config: await makeConfig({ respectRobots: false }),
      logger,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await crawler.run(['https://example.test/']);
    expect(requested).toContain('https://example.test/private/secret/');
  });

  it('seeds from the sitemap declared in robots.txt', async () => {
    const crawler = new Crawler({
      config: await makeConfig(),
      logger,
      useSitemaps: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await crawler.run(['https://example.test/']);

    // The i20 page is reachable only through the sitemap — nothing links to it.
    const models = await readRecords('new_car_model');
    expect(models.map((model) => (model as Record<string, string>).model).sort()).toEqual([
      'Swift',
      'i20',
    ]);
  });

  it('honours --only by emitting just the requested kinds, while still following links', async () => {
    const crawler = new Crawler({
      config: await makeConfig(),
      logger,
      onlyKinds: ['new_car_model'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await crawler.run(['https://example.test/']);

    expect(await readRecords('new_car_model')).toHaveLength(1);
    expect(await readRecords('used_car_listing')).toHaveLength(0);
    // The used-car page was still fetched, so its own links stay reachable.
    expect(requested).toContain('https://example.test/used/cars-in-pune/swift-2018-d123456/');
  });

  it('stops at maxPages and resumes from the checkpoint where it left off', async () => {
    const first = new Crawler({
      config: await makeConfig({ maxPages: 2 }),
      logger,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const firstStats = await first.run(['https://example.test/']);
    expect(firstStats.fetched).toBeLessThanOrEqual(3);

    const checkpoint = JSON.parse(
      await fsp.readFile(path.join(outputDir, 'checkpoint.json'), 'utf8'),
    );
    expect(checkpoint.pending.length).toBeGreaterThan(0);

    const resumed = new Crawler({
      config: await makeConfig({ resume: true }),
      logger,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await resumed.run([]);

    // Between the two runs every linked page is covered exactly once.
    const homeRequests = requested.filter((url) => url === 'https://example.test/');
    expect(homeRequests).toHaveLength(1);
    expect(await readRecords('new_car_model')).toHaveLength(1);
  });

  it('does not stall when a page fails', async () => {
    fetchImpl.mockImplementation(async (url: string) => {
      requested.push(url);
      if (url.includes('/maruti-cars/')) throw new Error('ECONNRESET');
      const page = SITE[url];
      if (!page) return new Response('not found', { status: 404 });
      return new Response(page.body, { headers: { 'content-type': page.type ?? 'text/html' } });
    });

    const crawler = new Crawler({
      config: await makeConfig({ maxRetries: 1, retryBaseDelayMs: 1 }),
      logger,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const stats = await crawler.run(['https://example.test/']);

    expect(stats.failed).toBeGreaterThan(0);
    // The rest of the crawl still completes.
    expect(await readRecords('used_car_listing')).toHaveLength(1);
  });
});
