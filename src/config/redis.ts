import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

// Redis is optional. When configured it backs distributed rate limiting so limits
// are enforced consistently across multiple app instances; without it, rate
// limiting falls back to per-instance in-memory counters (fine for a single
// instance / local dev, not for a horizontally scaled deployment).
export const redisClient = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : null;

if (redisClient) {
  redisClient.on('error', (err) => logger.error({ err }, 'Redis client error'));
  redisClient.on('connect', () => logger.info('Redis connection established'));
}

export async function connectRedis(): Promise<void> {
  // The rate limiter middleware (built at module-load time, before main()
  // runs) can issue its first Redis command before this explicit connect
  // call, which — since lazyConnect only defers the *initial* connect, not
  // every subsequent one — auto-connects the client early. ioredis throws
  // if .connect() is called again while already connecting/connected, so
  // only call it from the client's genuine pre-connect state.
  if (redisClient && redisClient.status === 'wait') {
    await redisClient.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
}
