import { Router } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../common/utils/asyncHandler';

const router = Router();

// Liveness: process is up and able to handle requests. Must never depend on
// downstream services — used by the orchestrator to decide whether to restart.
router.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: dependencies (database) are reachable. Used by the orchestrator/load
// balancer to decide whether to route traffic to this instance.
router.get(
  '/readyz',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not ready' });
    }
  }),
);

export default router;
