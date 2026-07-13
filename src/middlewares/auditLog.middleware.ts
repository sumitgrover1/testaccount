import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface AuditEntry {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// Writes to the immutable audit trail. Failures here are logged but never thrown
// back to the caller — an audit-log outage must not take down the primary
// request flow (though in a strict-compliance deployment this could instead be
// routed to a durable queue for guaranteed delivery).
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata as never,
      },
    });
  } catch (err) {
    logger.error({ err, entry }, 'Failed to write audit log entry');
  }
}

// Convenience factory for routes where a fixed action/resource should be logged
// on every successful (2xx/3xx) request, e.g. viewing a sensitive report.
export function auditRequest(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      void recordAudit({
        userId: req.user?.id,
        action,
        resource,
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
        metadata: { requestId: req.id, method: req.method, path: req.originalUrl },
      });
    });
    next();
  };
}
