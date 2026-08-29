import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/AppError';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Translate the few Prisma codes that map to a client mistake; everything
    // else stays a 500 so internal schema details are not disclosed.
    if (error.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'A record with these details already exists';
    } else if (error.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    }
  }

  if (statusCode >= 500) {
    logger.error({ err: error, requestId: req.id }, 'Unhandled error');
  } else {
    logger.warn({ requestId: req.id, code, message }, 'Request failed');
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(isProduction || statusCode < 500
        ? {}
        : { stack: error instanceof Error ? error.stack : undefined }),
    },
    requestId: req.id,
  });
}
