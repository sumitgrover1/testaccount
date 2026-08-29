import pino from 'pino';
import { env, isProduction } from './env';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  // Customer phone numbers and emails flow through lead endpoints; never let
  // them reach the log sink.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.phone',
      'req.body.email',
      'req.body.password',
      'res.headers["set-cookie"]',
    ],
    censor: '[redacted]',
  },
  transport: isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } },
});
