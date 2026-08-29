import { Router } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../common/utils/asyncHandler';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

router.get(
  '/health/ready',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ready' } });
  }),
);

export default router;
