import pino from 'pino';

/**
 * The scraper deliberately does not reuse src/config/logger.ts: that module
 * imports src/config/env.ts, which hard-fails without DATABASE_URL and the JWT
 * secrets. A crawler should be runnable with nothing but a network connection.
 *
 * Logs go to fd 2 so that `carwale-scrape ... > out.jsonl` stays a clean
 * dataset — diagnostics never interleave with records on stdout.
 */
export const logger = pino(
  {
    level: process.env.CARWALE_LOG_LEVEL ?? 'info',
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.destination(2),
);

export type Logger = typeof logger;

/**
 * Changes the level after the fact. The module-level `logger` is created at
 * import time, which is before the CLI has parsed `--log-level`, so the flag
 * has to reach it this way rather than through the environment.
 */
export function setLogLevel(level: string): void {
  logger.level = level;
}
