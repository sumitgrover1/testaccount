import type { Response } from 'express';
import { serializeBigInt } from './serialize';

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  res.status(200).json({ success: true, data: serializeBigInt(data), ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data: serializeBigInt(data) });
}
