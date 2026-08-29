import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import type { RecordKind, ScrapeRecord } from '../types';

/**
 * Writes records to disk, one file per record kind.
 *
 * JSONL is the default because a crawl is append-only and long-running: each
 * line is independently valid, so a run killed halfway leaves a readable file
 * rather than a truncated JSON array, and `wc -l` is an honest progress bar.
 * CSV is offered alongside for spreadsheet consumers, with nested fields
 * (specs, variants, images) JSON-encoded into their cell.
 */
export interface WriterOptions {
  outputDir: string;
  format: 'jsonl' | 'csv' | 'both';
}

const CSV_COLUMNS: Partial<Record<RecordKind, string[]>> = {
  new_car_model: [
    'meta.url',
    'meta.fetchedAt',
    'brand',
    'model',
    'title',
    'price.min',
    'price.max',
    'price.label',
    'bodyType',
    'fuelTypes',
    'transmissions',
    'seatingCapacity',
    'mileageKmpl',
    'engineCc',
    'maxPowerBhp',
    'maxTorqueNm',
    'rating.value',
    'rating.count',
    'variants',
    'specifications',
    'features',
    'images',
  ],
  used_car_listing: [
    'meta.url',
    'meta.fetchedAt',
    'listingId',
    'title',
    'brand',
    'model',
    'variant',
    'registrationYear',
    'price.min',
    'price.max',
    'kilometresDriven',
    'fuelType',
    'transmission',
    'ownerCount',
    'city',
    'area',
    'sellerType',
    'sellerName',
    'certified',
    'images',
  ],
  dealer: [
    'meta.url',
    'name',
    'brand',
    'addressLine',
    'city',
    'state',
    'postalCode',
    'phone',
    'latitude',
    'longitude',
  ],
  review: ['meta.url', 'subject', 'author', 'publishedAt', 'rating.value', 'title', 'body'],
  news_article: ['meta.url', 'headline', 'author', 'publishedAt', 'summary', 'tags'],
  unclassified_page: ['meta.url', 'title', 'jsonLdTypes'],
};

export class RecordWriter {
  private readonly streams = new Map<string, fs.WriteStream>();
  private readonly csvHeaderWritten = new Set<string>();
  readonly counts: Record<string, number> = {};

  constructor(private readonly options: WriterOptions) {}

  async init(): Promise<void> {
    await fsp.mkdir(this.options.outputDir, { recursive: true });
  }

  private stream(name: string): fs.WriteStream {
    const existing = this.streams.get(name);
    if (existing) return existing;
    // 'a' rather than 'w': `--resume` must extend the previous run's dataset,
    // not silently truncate it.
    const created = fs.createWriteStream(path.join(this.options.outputDir, name), { flags: 'a' });
    this.streams.set(name, created);
    return created;
  }

  async write(record: ScrapeRecord): Promise<void> {
    this.counts[record.kind] = (this.counts[record.kind] ?? 0) + 1;

    if (this.options.format !== 'csv') {
      await writeLine(this.stream(`${record.kind}.jsonl`), `${JSON.stringify(record)}\n`);
    }
    if (this.options.format !== 'jsonl') {
      const columns = CSV_COLUMNS[record.kind] ?? ['meta.url'];
      const file = `${record.kind}.csv`;
      const stream = this.stream(file);
      if (!this.csvHeaderWritten.has(file)) {
        this.csvHeaderWritten.add(file);
        await writeLine(stream, `${columns.join(',')}\n`);
      }
      const row = columns.map((column) => csvCell(getPath(record, column)));
      await writeLine(stream, `${row.join(',')}\n`);
    }
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.streams.values()].map(
        (stream) =>
          new Promise<void>((resolve, reject) => {
            stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
          }),
      ),
    );
    this.streams.clear();
  }
}

/**
 * Awaiting the drain signal is what keeps a fast crawl from buffering the
 * whole dataset in memory when the disk is slower than the network.
 */
function writeLine(stream: fs.WriteStream, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stream.write(line)) {
      resolve();
      return;
    }
    stream.once('drain', resolve);
    stream.once('error', reject);
  });
}

export function getPath(source: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

/** RFC 4180: quote when the value contains a comma, quote or newline; double inner quotes. */
export function csvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
