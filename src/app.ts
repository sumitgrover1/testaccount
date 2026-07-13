import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { requestId } from './middlewares/requestId.middleware';
import {
  corsMiddleware,
  enforceHttps,
  helmetMiddleware,
  hppMiddleware,
} from './middlewares/security.middleware';
import { generalRateLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes';

export function createApp(): Express {
  const app = express();

  // Required for correct client IP / protocol detection when behind a load
  // balancer or reverse proxy (affects rate limiting and secure-cookie logic).
  app.set('trust proxy', env.TRUST_PROXY);
  // Signals to clients/tooling that this is not an Express default config.
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(enforceHttps);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(hppMiddleware);
  app.use(compression());
  // Body size limits bound request payloads to mitigate memory-exhaustion DoS.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(generalRateLimiter);

  app.use(healthRoutes);
  app.use(env.API_PREFIX, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
