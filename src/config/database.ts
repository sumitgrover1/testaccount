import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

// Singleton Prisma client. Prisma parameterizes all queries, which is the primary
// SQL-injection defense; raw queries (if ever needed) must use $queryRaw with
// tagged templates, never string concatenation.
export const prisma = new PrismaClient({
  log:
    env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],
});

if (env.NODE_ENV === 'development') {
  prisma.$on('query', (e: { query: string; duration: number }) => {
    logger.debug({ query: e.query, durationMs: e.duration }, 'prisma query');
  });
}

prisma.$on('error', (e: { message: string }) => {
  logger.error({ err: e.message }, 'prisma error');
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connection established');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}
