import { loadConfig, type ScraperConfigInput } from './config';
import { logger, setLogLevel } from './logger';
import { Crawler } from './crawl/crawler';
import { HttpClient } from './http/client';
import { RateLimiter } from './http/rate-limiter';
import { ResponseCache } from './http/cache';
import { RobotsPolicy } from './http/robots';
import { crawlSitemaps } from './discover/sitemap';
import { createPageContext, parsePage } from './parse';
import { loadSelectors } from './parse/selectors';
import { classifyUrl } from './crawl/urls';
import type { RecordKind } from './types';

const USAGE = `
carwale-scrape — a polite crawler for carwale.com

Usage
  npm run scrape -- <command> [options]

Commands
  crawl [seed-url...]   Crawl the site. With no seed, starts at the base URL.
  sitemap               Print every URL declared in the site's sitemaps (one per line).
  url <url>             Fetch and parse a single URL, printing the records as JSON.
  inspect <url>         Report which selectors match on a page — use when tuning selectors.
  robots [url]          Print the robots.txt decision and Crawl-delay for a URL.

Options
  --base-url <url>          Origin to crawl                       (default https://www.carwale.com)
  --out <dir>               Output directory                      (default ./carwale-data)
  --format <jsonl|csv|both> Output format                         (default jsonl)
  --concurrency <n>         Simultaneous requests                 (default 2)
  --delay <ms>              Minimum gap between requests per host (default 1000)
  --max-pages <n>           Stop after N fetched pages, 0 = all   (default 0)
  --max-depth <n>           Link depth from the seeds             (default 3)
  --only <kinds>            Comma-separated record kinds to emit
  --sitemaps                Seed the frontier from the site's sitemaps first
  --selectors <file>        JSON file overriding the CSS selectors
  --user-agent <ua>         Crawler user-agent (identify yourself, include a contact)
  --resume                  Continue from the checkpoint file
  --checkpoint <file>       Checkpoint path                       (default ./.carwale-checkpoint.json)
  --no-cache                Do not read or write the on-disk HTTP cache
  --save-html               Keep the raw HTML of every page under <out>/raw
  --ignore-robots           Do not enforce robots.txt (see README before using)
  --log-level <level>       trace|debug|info|warn|error|silent
  -h, --help                Show this help

Examples
  npm run scrape -- crawl --sitemaps --max-pages 500 --out ./data
  npm run scrape -- url https://www.carwale.com/maruti-suzuki-cars/swift/
  npm run scrape -- inspect https://www.carwale.com/maruti-suzuki-cars/swift/
`;

interface ParsedArgs {
  command: string;
  positionals: string[];
  config: ScraperConfigInput;
  onlyKinds?: RecordKind[];
  useSitemaps: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    command: '',
    positionals: [],
    config: {},
    useSitemaps: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = (): string => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Option ${arg} requires a value`);
      }
      i += 1;
      return next;
    };

    switch (arg) {
      case '-h':
      case '--help':
        out.help = true;
        break;
      case '--base-url':
        out.config.baseUrl = value();
        break;
      case '--out':
        out.config.outputDir = value();
        break;
      case '--format':
        out.config.outputFormat = value() as ScraperConfigInput['outputFormat'];
        break;
      case '--concurrency':
        out.config.concurrency = value();
        break;
      case '--delay':
        out.config.minDelayMs = value();
        break;
      case '--max-pages':
        out.config.maxPages = value();
        break;
      case '--max-depth':
        out.config.maxDepth = value();
        break;
      case '--only':
        out.onlyKinds = value().split(',').map((kind) => kind.trim()) as RecordKind[];
        break;
      case '--sitemaps':
        out.useSitemaps = true;
        break;
      case '--selectors':
        out.config.selectorsFile = value();
        break;
      case '--user-agent':
        out.config.userAgent = value();
        break;
      case '--resume':
        out.config.resume = true;
        break;
      case '--checkpoint':
        out.config.checkpointFile = value();
        break;
      case '--no-cache':
        out.config.cacheEnabled = false;
        break;
      case '--save-html':
        out.config.saveRawHtml = true;
        break;
      case '--ignore-robots':
        out.config.respectRobots = false;
        break;
      case '--log-level':
        out.config.logLevel = value() as ScraperConfigInput['logLevel'];
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
        if (!out.command) out.command = arg;
        else out.positionals.push(arg);
    }
  }

  return out;
}

function write(line: string): void {
  process.stdout.write(`${line}\n`);
}

/** A client for the one-off commands, which need fetching but not a full crawl. */
function standaloneClient(config: ReturnType<typeof loadConfig>): HttpClient {
  return new HttpClient({
    userAgent: config.userAgent,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
    retryBaseDelayMs: config.retryBaseDelayMs,
    retryMaxDelayMs: config.retryMaxDelayMs,
    rateLimiter: new RateLimiter({
      concurrency: config.concurrency,
      minDelayMs: config.minDelayMs,
      jitterMs: config.jitterMs,
    }),
    cache: config.cacheEnabled ? new ResponseCache(config.cacheDir, config.cacheTtlMs) : undefined,
    logger,
  });
}

async function runCrawl(args: ParsedArgs): Promise<void> {
  const config = loadConfig(args.config);
  const crawler = new Crawler({
    config,
    logger,
    onlyKinds: args.onlyKinds,
    useSitemaps: args.useSitemaps,
  });

  // Ctrl-C asks for a graceful stop so the checkpoint is written and the
  // output files are flushed; a second one is taken as "I meant now".
  let interrupted = false;
  const onSignal = (): void => {
    if (interrupted) process.exit(130);
    interrupted = true;
    logger.warn('interrupt received — finishing in-flight requests, press again to force quit');
    crawler.stop();
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const seeds = args.positionals.length ? args.positionals : [config.baseUrl];
  const stats = await crawler.run(seeds);
  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);

  logger.info({ stats }, 'crawl finished');
  write(JSON.stringify(stats, null, 2));
}

async function runSitemap(args: ParsedArgs): Promise<void> {
  const config = loadConfig(args.config);
  const client = standaloneClient(config);
  const origin = new URL(config.baseUrl).origin;
  const robots = new RobotsPolicy(config.userAgent, async (url) => {
    const response = await client.get(url, { accept: 'text/plain' });
    return { status: response.status, body: response.body };
  });

  const declared = await robots.sitemaps(origin);
  const roots = declared.length ? declared : [`${origin}/sitemap.xml`];
  await crawlSitemaps(roots, {
    client,
    logger,
    maxUrls: config.maxPages || 0,
    // Streamed rather than collected so `| head` works and a huge sitemap
    // tree does not have to fit in memory before the first line appears.
    onEntry: (entry) => write(entry.url),
  });
}

async function runUrl(args: ParsedArgs): Promise<void> {
  const target = args.positionals[0];
  if (!target) throw new Error('Usage: url <url>');

  const config = loadConfig(args.config);
  const client = standaloneClient(config);
  const response = await client.get(target);
  const ctx = createPageContext({
    url: target,
    finalUrl: response.finalUrl,
    status: response.status,
    html: response.body,
    selectors: loadSelectors(config.selectorsFile),
  });

  const kind = classifyUrl(response.finalUrl);
  for (const record of parsePage(kind, ctx)) write(JSON.stringify(record, null, 2));
}

/**
 * Prints, selector by selector, what each one currently matches on a live
 * page. This is the tool for re-pointing the scraper after a markup change:
 * run it, see which lists come back empty, fix those in a selectors JSON file.
 */
async function runInspect(args: ParsedArgs): Promise<void> {
  const target = args.positionals[0];
  if (!target) throw new Error('Usage: inspect <url>');

  const config = loadConfig(args.config);
  const client = standaloneClient(config);
  const response = await client.get(target);
  const selectors = loadSelectors(config.selectorsFile);
  const ctx = createPageContext({
    url: target,
    finalUrl: response.finalUrl,
    status: response.status,
    html: response.body,
    selectors,
  });

  write(`URL          ${response.finalUrl}`);
  write(`Classified   ${classifyUrl(response.finalUrl)}`);
  write(`JSON-LD      ${ctx.jsonLd.length} block(s): ${JSON.stringify(ctx.jsonLd.map((n) => n['@type']))}`);
  write(`__NEXT_DATA__ ${ctx.nextData ? 'present' : 'absent'}`);
  write('');

  for (const [section, fields] of Object.entries(selectors)) {
    write(`[${section}]`);
    for (const [field, list] of Object.entries(fields as Record<string, string[]>)) {
      const hits = list.map((selector) => `${selector} → ${ctx.$(selector).length}`);
      const total = list.reduce((sum, selector) => sum + ctx.$(selector).length, 0);
      write(`  ${total === 0 ? 'MISS' : ' OK '} ${field.padEnd(20)} ${hits.join(' | ')}`);
    }
    write('');
  }
}

async function runRobots(args: ParsedArgs): Promise<void> {
  const config = loadConfig(args.config);
  const target = args.positionals[0] ?? config.baseUrl;
  const client = standaloneClient(config);
  const robots = new RobotsPolicy(config.userAgent, async (url) => {
    const response = await client.get(url, { accept: 'text/plain' });
    return { status: response.status, body: response.body };
  });

  const decision = await robots.isAllowed(target);
  const crawlDelay = await robots.crawlDelayMs(target);
  write(
    JSON.stringify(
      {
        url: target,
        userAgent: config.userAgent,
        allowed: decision.allowed,
        matchedRule: decision.rule,
        crawlDelayMs: crawlDelay,
        sitemaps: await robots.sitemaps(new URL(target).origin),
      },
      null,
      2,
    ),
  );
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n${USAGE}`);
    return 2;
  }

  if (args.help || !args.command) {
    write(USAGE);
    return args.command ? 0 : 1;
  }

  if (args.config.logLevel) setLogLevel(args.config.logLevel);

  try {
    switch (args.command) {
      case 'crawl':
        await runCrawl(args);
        return 0;
      case 'sitemap':
        await runSitemap(args);
        return 0;
      case 'url':
        await runUrl(args);
        return 0;
      case 'inspect':
        await runInspect(args);
        return 0;
      case 'robots':
        await runRobots(args);
        return 0;
      default:
        process.stderr.write(`Unknown command: ${args.command}\n${USAGE}`);
        return 2;
    }
  } catch (err) {
    logger.error({ err }, 'command failed');
    return 1;
  }
}

// `require.main === module` keeps this importable from tests without running.
if (require.main === module) {
  void main().then((code) => {
    process.exitCode = code;
  });
}
