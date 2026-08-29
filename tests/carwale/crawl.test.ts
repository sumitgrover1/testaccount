import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { Frontier } from '../../src/scrapers/carwale/crawl/frontier';
import { loadCheckpoint, saveCheckpoint } from '../../src/scrapers/carwale/crawl/checkpoint';
import { crawlSitemaps, parseSitemap } from '../../src/scrapers/carwale/discover/sitemap';
import { RecordWriter, csvCell, getPath } from '../../src/scrapers/carwale/output/writer';
import type { HttpClient } from '../../src/scrapers/carwale/http/client';
import type { NewCarModel } from '../../src/scrapers/carwale/types';
import { logger } from '../../src/scrapers/carwale/logger';

const tmpDir = async (): Promise<string> => fs.mkdtemp(path.join(os.tmpdir(), 'carwale-test-'));

describe('Frontier', () => {
  it('serves detail pages before index pages regardless of insertion order', () => {
    const frontier = new Frontier(5);
    frontier.add({ url: 'https://a.test/list/', depth: 0, kind: 'unclassified_page' });
    frontier.add({ url: 'https://a.test/news/story/', depth: 0, kind: 'news_article' });
    frontier.add({ url: 'https://a.test/x-cars/swift/', depth: 0, kind: 'new_car_model' });

    expect(frontier.next()?.kind).toBe('new_car_model');
    expect(frontier.next()?.kind).toBe('news_article');
    expect(frontier.next()?.kind).toBe('unclassified_page');
    expect(frontier.next()).toBeUndefined();
  });

  it('rejects a URL it has already queued, including trailing-slash variants', () => {
    const frontier = new Frontier(5);
    expect(frontier.add({ url: 'https://a.test/swift/', depth: 0, kind: 'new_car_model' })).toBe(true);
    expect(frontier.add({ url: 'https://a.test/swift', depth: 1, kind: 'new_car_model' })).toBe(false);
    expect(frontier.pending).toBe(1);
  });

  it('refuses items beyond the depth limit', () => {
    const frontier = new Frontier(1);
    expect(frontier.add({ url: 'https://a.test/a', depth: 1, kind: 'new_car_model' })).toBe(true);
    expect(frontier.add({ url: 'https://a.test/b', depth: 2, kind: 'new_car_model' })).toBe(false);
  });

  it('restores a snapshot without re-checking the visited set', () => {
    const frontier = new Frontier(5);
    frontier.add({ url: 'https://a.test/a', depth: 0, kind: 'new_car_model' });
    const snapshot = frontier.drainAll();
    expect(frontier.pending).toBe(0);
    snapshot.forEach((item) => frontier.requeue(item));
    expect(frontier.pending).toBe(1);
  });
});

describe('checkpoint', () => {
  it('round-trips and survives a corrupt file', async () => {
    const dir = await tmpDir();
    const file = path.join(dir, 'checkpoint.json');
    await saveCheckpoint(file, {
      version: 1,
      baseUrl: 'https://a.test',
      savedAt: new Date().toISOString(),
      visited: ['a.test/x'],
      pending: [{ url: 'https://a.test/y', depth: 1, kind: 'new_car_model' }],
      stats: {
        startedAt: new Date().toISOString(),
        requested: 1,
        fetched: 1,
        fromCache: 0,
        failed: 0,
        skippedByRobots: 0,
        skippedDuplicate: 0,
        emitted: {},
        bytesDownloaded: 10,
      },
    });

    const loaded = await loadCheckpoint(file);
    expect(loaded?.pending[0].url).toBe('https://a.test/y');

    await fs.writeFile(file, '{ not json');
    await expect(loadCheckpoint(file)).resolves.toBeUndefined();
    await expect(loadCheckpoint(path.join(dir, 'missing.json'))).resolves.toBeUndefined();
  });
});

describe('parseSitemap', () => {
  it('reads a sitemap index', () => {
    const xml = `<?xml version="1.0"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://a.test/sitemap-cars.xml</loc></sitemap>
        <sitemap><loc>https://a.test/sitemap-news.xml.gz</loc></sitemap>
      </sitemapindex>`;
    expect(parseSitemap(xml)).toEqual({
      sitemaps: ['https://a.test/sitemap-cars.xml', 'https://a.test/sitemap-news.xml.gz'],
      entries: [],
    });
  });

  it('reads a urlset with lastmod', () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://a.test/x-cars/swift/</loc><lastmod>2026-01-02</lastmod></url>
        <url><loc>https://a.test/x-cars/baleno/</loc></url>
      </urlset>`;
    const parsed = parseSitemap(xml);
    expect(parsed.entries).toEqual([
      { url: 'https://a.test/x-cars/swift/', lastModified: '2026-01-02' },
      { url: 'https://a.test/x-cars/baleno/', lastModified: undefined },
    ]);
  });
});

describe('crawlSitemaps', () => {
  const stubClient = (pages: Record<string, string>): HttpClient =>
    ({
      get: async (url: string) => ({
        url,
        finalUrl: url,
        status: pages[url] ? 200 : 404,
        headers: {},
        body: pages[url] ?? '',
        fromCache: false,
        bytes: 0,
      }),
    }) as unknown as HttpClient;

  it('walks an index tree and returns the leaf URLs', async () => {
    const pages = {
      'https://a.test/sitemap.xml': `<sitemapindex><sitemap><loc>https://a.test/s1.xml</loc></sitemap></sitemapindex>`,
      'https://a.test/s1.xml': `<urlset><url><loc>https://a.test/one/</loc></url><url><loc>https://a.test/two/</loc></url></urlset>`,
    };
    const entries = await crawlSitemaps(['https://a.test/sitemap.xml'], {
      client: stubClient(pages),
      logger,
    });
    expect(entries.map((entry) => entry.url)).toEqual(['https://a.test/one/', 'https://a.test/two/']);
  });

  it('does not loop on a sitemap that references itself', async () => {
    const pages = {
      'https://a.test/sitemap.xml': `<sitemapindex><sitemap><loc>https://a.test/sitemap.xml</loc></sitemap></sitemapindex>`,
    };
    await expect(
      crawlSitemaps(['https://a.test/sitemap.xml'], { client: stubClient(pages), logger }),
    ).resolves.toEqual([]);
  });

  it('stops at maxUrls', async () => {
    const pages = {
      'https://a.test/sitemap.xml': `<urlset><url><loc>https://a.test/1</loc></url><url><loc>https://a.test/2</loc></url><url><loc>https://a.test/3</loc></url></urlset>`,
    };
    const entries = await crawlSitemaps(['https://a.test/sitemap.xml'], {
      client: stubClient(pages),
      logger,
      maxUrls: 2,
    });
    expect(entries).toHaveLength(2);
  });
});

describe('RecordWriter', () => {
  const record = (url: string): NewCarModel => ({
    kind: 'new_car_model',
    meta: {
      url,
      fetchedAt: '2026-01-01T00:00:00.000Z',
      httpStatus: 200,
      strategies: ['json-ld'],
      contentHash: 'abc',
      depth: 0,
    },
    brand: 'Maruti Suzuki',
    model: 'Swift',
    title: 'Maruti Suzuki Swift, "the" hatchback',
    price: { min: 649_000, max: 914_000, currency: 'INR' },
    fuelTypes: ['Petrol'],
    transmissions: ['Manual'],
    images: [],
    variants: [],
    specifications: {},
    features: [],
  });

  it('writes one JSONL file per kind, one record per line', async () => {
    const dir = await tmpDir();
    const writer = new RecordWriter({ outputDir: dir, format: 'jsonl' });
    await writer.init();
    await writer.write(record('https://a.test/1'));
    await writer.write(record('https://a.test/2'));
    await writer.close();

    const lines = (await fs.readFile(path.join(dir, 'new_car_model.jsonl'), 'utf8'))
      .trim()
      .split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).meta.url).toBe('https://a.test/1');
    expect(writer.counts.new_car_model).toBe(2);
  });

  it('writes a CSV header once and quotes cells that need it', async () => {
    const dir = await tmpDir();
    const writer = new RecordWriter({ outputDir: dir, format: 'csv' });
    await writer.init();
    await writer.write(record('https://a.test/1'));
    await writer.write(record('https://a.test/2'));
    await writer.close();

    const csv = (await fs.readFile(path.join(dir, 'new_car_model.csv'), 'utf8')).trim().split('\n');
    expect(csv).toHaveLength(3);
    expect(csv[0].startsWith('meta.url,meta.fetchedAt,brand')).toBe(true);
    expect(csv[1]).toContain('"Maruti Suzuki Swift, ""the"" hatchback"');
  });

  it('appends rather than truncating, so --resume extends the dataset', async () => {
    const dir = await tmpDir();
    const first = new RecordWriter({ outputDir: dir, format: 'jsonl' });
    await first.init();
    await first.write(record('https://a.test/1'));
    await first.close();

    const second = new RecordWriter({ outputDir: dir, format: 'jsonl' });
    await second.init();
    await second.write(record('https://a.test/2'));
    await second.close();

    const lines = (await fs.readFile(path.join(dir, 'new_car_model.jsonl'), 'utf8'))
      .trim()
      .split('\n');
    expect(lines).toHaveLength(2);
  });
});

describe('csv helpers', () => {
  it('quotes only when required and doubles inner quotes', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(['a', 'b'])).toBe('"[""a"",""b""]"');
  });

  it('reads dotted paths and tolerates missing branches', () => {
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(getPath({ a: {} }, 'a.b.c')).toBeUndefined();
    expect(getPath(undefined, 'a')).toBeUndefined();
  });
});
