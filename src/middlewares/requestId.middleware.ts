import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';

// Assigns a correlation ID to every request so logs, error responses, and audit
// entries can be tied together for incident investigation. A client-supplied
// value is honored (useful behind an API gateway) but always validated/bounded.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  const isValid = typeof incoming === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(incoming);
  req.id = isValid ? (incoming as string) : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}
