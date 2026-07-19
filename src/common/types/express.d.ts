import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        role: Role;
      };
      // Raw request body bytes, captured by express.json()'s verify hook (see
      // app.ts) so webhook handlers can validate an HMAC signature against the
      // exact bytes the sender signed — parsed/re-serialized JSON would not
      // byte-for-byte match.
      rawBody?: Buffer;
    }
  }
}

export {};
