import fs from 'fs/promises';
import path from 'path';
import type { CrawlStats } from '../types';
import type { FrontierItem } from './frontier';

/**
 * Crawl state that survives a restart.
 *
 * A full-site crawl runs for hours; without this, a dropped connection or a
 * Ctrl-C means starting over and re-requesting everything already fetched —
 * which is both slow and rude to the site.
 */
export interface Checkpoint {
  version: 1;
  baseUrl: string;
  savedAt: string;
  /** Dedupe keys, not URLs: the same thing the frontier de-duplicates on. */
  visited: string[];
  pending: FrontierItem[];
  stats: CrawlStats;
}

export async function saveCheckpoint(file: string, checkpoint: Checkpoint): Promise<void> {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  // Write-then-rename: a checkpoint is written repeatedly during a run, and a
  // crash mid-write must not destroy the last good one.
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(checkpoint), 'utf8');
  await fs.rename(tmp, file);
}

export async function loadCheckpoint(file: string): Promise<Checkpoint | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as Checkpoint;
    return parsed.version === 1 ? parsed : undefined;
  } catch {
    return undefined;
  }
}
