import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// A per-request correlation id, echoed back so a customer-reported problem can
// be traced to its log lines.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
}
