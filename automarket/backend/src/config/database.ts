import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
