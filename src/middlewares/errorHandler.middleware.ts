import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/errors/AppError';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return new AppError('A record with this value already exists', 409, 'CONFLICT');
    }
    if (err.code === 'P2025') {
      return new AppError('Resource not found', 404, 'NOT_FOUND');
    }
  }

  if (err instanceof Error && err.name === 'CorsError') {
    return new AppError('Origin not allowed', 403, 'FORBIDDEN');
  }

  // Unknown/unexpected error: never leak internal details to the client.
  const appError = new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
  Object.defineProperty(appError, 'isOperational', { value: false });
  return appError;
}

// Centralized error handler — the single place response shape and logging for
// errors is decided. Must be registered last, after all routes.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const appError = toAppError(err);

  const logPayload = {
    requestId: req.id,
    statusCode: appError.statusCode,
    code: appError.code,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    // Server-side only (never sent to the client, unlike appError.details on
    // the response body below) — e.g. which fields failed validation and
    // why, needed to diagnose a report like "creating a user fails" without
    // being able to reproduce it locally.
    details: appError.details,
  };

  if (appError.statusCode >= 500 || !appError.isOperational) {
    logger.error({ ...logPayload, err }, appError.message);
  } else {
    logger.warn(logPayload, appError.message);
  }

  const body: ErrorResponseBody = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId: String(req.id),
    },
  };

  if (env.NODE_ENV !== 'production' && appError.details) {
    body.error.details = appError.details;
  }

  res.status(appError.statusCode).json(body);
}
