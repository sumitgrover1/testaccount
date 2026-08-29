import type { AdminRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        email: string;
        role: AdminRole;
      };
    }
  }
}

export {};
