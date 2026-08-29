import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/respond';
import * as authService from './auth.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  ok(res, await authService.login(email, password));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  ok(res, await authService.refresh(refreshToken));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await authService.profile(req.user!.id));
});
