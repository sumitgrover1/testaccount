# CarWale scraper

A polite, resumable crawler that walks carwale.com and writes structured
records — new-car models and their specs and variants, used-car listings,
dealers, reviews and news — as JSONL or CSV.

```bash
# One page, straight to stdout — the fastest way to see what you get
npm run scrape -- url https://www.carwale.com/maruti-suzuki-cars/swift/

# A bounded crawl seeded from the site's own sitemaps
npm run scrape -- crawl --sitemaps --max-pages 500 --out ./carwale-data

# Everything the sitemaps declare, resumable, both output formats
npm run scrape -- crawl --sitemaps --format both --resume --out ./carwale-data
```

## Before you run it

Scraping a site you do not own is a decision with terms attached, and this tool
does not make it for you:

- **Check CarWale's Terms of Use and robots.txt** for the paths you intend to
  crawl. `npm run scrape -- robots <url>` prints the decision, the rule that
  produced it and the declared `Crawl-delay` without crawling anything.
- **Identify yourself.** The default user-agent is a placeholder. Set
  `CARWALE_CONTACT` (or `--user-agent`) to a real contact URL or address, so an
  unexplained traffic spike reaches you as an e-mail rather than as a ban.
- **The defaults are deliberately slow** — two concurrent requests, one second
  apart. Prefer running for longer over running harder.
- `--ignore-robots` exists for sites you own or have a written agreement with.
  Pointing it at a third party is your call and your liability.

## Commands

| Command | What it does |
| --- | --- |
| `crawl [seed-url...]` | Crawl the site, writing records to `--out`. Defaults to the base URL as the seed. |
| `sitemap` | Print every URL the site's sitemaps declare, one per line. Streams, so `\| head` works. |
| `url <url>` | Fetch and parse one URL, printing the records as JSON. No files written. |
| `inspect <url>` | Report which CSS selectors currently match on a page. Use when tuning. |
| `robots [url]` | Print the robots.txt decision, matched rule, crawl-delay and sitemaps. |

Run `npm run scrape -- --help` for the full option list.

## Output

One file per record kind in `--out`, e.g. `new_car_model.jsonl`,
`used_car_listing.jsonl`, `dealer.jsonl`. JSONL is the default because a crawl
is append-only and long-running: every line is independently valid, so a run
that is interrupted still leaves a readable dataset. `--format csv` (or `both`)
writes a spreadsheet-friendly view with nested fields JSON-encoded per cell.

Every record carries a `meta` block:

```json
{
  "kind": "new_car_model",
  "meta": {
    "url": "https://www.carwale.com/maruti-suzuki-cars/swift/",
    "canonicalUrl": "https://www.carwale.com/maruti-suzuki-cars/swift/",
    "fetchedAt": "2026-08-29T10:12:00.000Z",
    "httpStatus": 200,
    "strategies": ["json-ld", "css"],
    "contentHash": "6384f53a…",
    "depth": 1
  },
  "brand": "Maruti Suzuki",
  "model": "Swift",
  "price": { "min": 649000, "max": 914000, "label": "₹ 6.49 - 9.14 Lakh", "currency": "INR" }
}
```

Two fields there earn their keep:

- **`strategies`** records which extractors actually contributed. Structured
  data (`json-ld`, `next-data`) survives a redesign; `css` does not. A run whose
  records suddenly rely only on `css`, or that lose fields entirely, is telling
  you the selectors need attention.
- **`contentHash`** is a hash of the extracted payload, not of the HTML, so it
  changes when the *data* changes and not when an ad slot does. Re-crawls can
  diff on it to find what actually moved.

Prices are normalised to rupees: `₹ 6.49 - 9.14 Lakh` becomes
`min: 649000, max: 914000`, with the rendered text kept in `label`.

## How extraction works

For each field, in order, first hit wins:

1. **JSON-LD** (`schema.org` `Car`, `Vehicle`, `Product`, `NewsArticle`, …).
2. **Embedded app state** (`__NEXT_DATA__` and `window.__…__` blobs).
3. **CSS selectors**, each field with an ordered list of fallbacks ending in a
   document-level standard (`og:title`, `itemprop`, `<h1>`).

Spec tables are read generically as label/value pairs and then matched **by
label** (`/mileage|arai/i`, `/max\.?\s*power/i`, …), not by column position, so
a reordered or extended table still populates `mileageKmpl` and friends. The
site's own spec grouping is preserved verbatim in `specifications`, so a label
this code has never seen still lands in the output instead of being dropped.

### Tuning selectors

**The CSS selectors shipped here are unverified against CarWale's live
markup** — the environment this was built in cannot reach the site — so treat
them as a starting point. The structured-data path does not depend on them.

To re-point them, no code change is needed:

```bash
npm run scrape -- inspect https://www.carwale.com/maruti-suzuki-cars/swift/
```

That prints, field by field, which selectors match and how many nodes each
one found. Fix the ones marked `MISS` in a JSON file:

```json
{ "newCarModel": { "price": [".new-price-class"], "specGroup": ["[data-x=specs]"] } }
```

```bash
npm run scrape -- crawl --selectors ./my-selectors.json
```

A field's list is **replaced**, not appended to — an override exists because the
default is wrong, and appending would leave the broken selector matching first.

## Crawl behaviour

- **robots.txt** is fetched once per origin, parsed with longest-match-wins
  precedence (`Allow` beating `Disallow` on a tie), and applied to redirect
  targets as well as to queued URLs. An unreadable robots.txt (5xx, connection
  failure) is treated as "do not crawl"; a 404 as "no restrictions".
- **Crawl-delay** from robots.txt only ever *raises* the delay floor — the site
  can slow you down, never speed you up.
- **A 429** doubles the delay for that host for the rest of the run, rather than
  only for the retry, so every worker learns the limit at once.
- **Retries** cover network errors, 408/425/429 and 5xx, with exponential
  backoff plus full jitter, honouring `Retry-After`.
- **The frontier** prioritises detail pages over index pages, so a crawl cut
  short by `--max-pages` spends its budget on records. URLs are de-duplicated
  on a normalised key, so `/swift`, `/swift/` and `/swift/?utm_source=x` are one
  page.
- **Sitemaps** (`--sitemaps`) reach pages that no link path finds within
  `--max-depth`; link-following reaches what the sitemaps omit. Use both for
  coverage.
- **Interrupts** are graceful: Ctrl-C finishes in-flight requests, flushes the
  output and writes the checkpoint. A second one quits immediately.

### Resuming

A checkpoint (visited set + pending queue + stats) is written every 50 pages and
at the end of a run. `--resume` picks it back up, and output files are appended
to rather than truncated, so a multi-day crawl survives a restart without
re-requesting what it already has.

### Caching

Responses are cached on disk (`./.carwale-cache`, 24h TTL) so that iterating on
selectors costs zero extra requests to the site. `--no-cache` disables it;
`CARWALE_CACHE_DIR` moves it.

## Configuration

CLI flags beat environment variables, which beat defaults.

| Variable | Meaning |
| --- | --- |
| `CARWALE_CONTACT` | Contact URL/e-mail folded into the default user-agent |
| `CARWALE_USER_AGENT` | Full user-agent override |
| `CARWALE_BASE_URL` | Origin to crawl |
| `CARWALE_CONCURRENCY`, `CARWALE_MIN_DELAY_MS` | Politeness |
| `CARWALE_MAX_PAGES`, `CARWALE_MAX_DEPTH` | Crawl bounds |
| `CARWALE_OUTPUT_DIR`, `CARWALE_CACHE_DIR` | Paths |
| `CARWALE_SELECTORS_FILE` | Selector override file |
| `CARWALE_LOG_LEVEL` | `trace`…`silent` |

## Layout

```
src/scrapers/carwale/
  cli.ts              Command-line entry point
  config.ts           Zod-validated configuration and its defaults
  types.ts            Record schemas
  http/               Rate limiter, robots.txt, retrying client, disk cache
  parse/              Page context, selectors, per-kind parsers
  crawl/              URL normalisation and classification, frontier, checkpoint, crawler
  discover/sitemap.ts Sitemap-index walker
  output/writer.ts    JSONL and CSV writers
```

The crawler is importable as a library — `import { Crawler, loadConfig } from
'./src/scrapers/carwale'` — if you would rather drive it from a job runner than
from the CLI. It has no dependency on this repository's `env`/Prisma setup and
runs with nothing but a network connection.

## Tests

```bash
npx jest tests/carwale
```

Parsers are tested against saved HTML fixtures; the crawler is tested
end-to-end against a simulated site with an injected `fetch`, covering robots
enforcement, sitemap seeding, `--only`, checkpoint resume and failure recovery.
