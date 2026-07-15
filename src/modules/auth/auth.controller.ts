import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../common/errors/AppError';
import { issueCsrfCookie } from '../../middlewares/csrf.middleware';
import * as authService from './auth.service';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from './auth.validation';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function requestContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.header('user-agent') };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const { accessToken, refreshToken, userId } = await authService.login(input, requestContext(req));
  setRefreshCookie(res, refreshToken);
  issueCsrfCookie(res);
  res.status(200).json({ data: { accessToken, userId } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token missing');
  }
  const { accessToken, refreshToken } = await authService.refresh(
    rawRefreshToken,
    requestContext(req),
  );
  setRefreshCookie(res, refreshToken);
  issueCsrfCookie(res);
  res.status(200).json({ data: { accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawRefreshToken) {
    await authService.logout(rawRefreshToken);
  }
  clearRefreshCookie(res);
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);
  clearRefreshCookie(res);
  res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ForgotPasswordInput;
  await authService.forgotPassword(input, requestContext(req));
  // Always return the same generic response to avoid account enumeration.
  res.status(200).json({
    data: { message: 'If an account with that email exists, a reset link has been sent.' },
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ResetPasswordInput;
  await authService.resetPassword(input.token, input.newPassword, requestContext(req));
  res.status(200).json({ data: { message: 'Password has been reset successfully.' } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ChangePasswordInput;
  await authService.changePassword(req.user!.id, input.currentPassword, input.newPassword);
  res.status(200).json({ data: { message: 'Password changed successfully.' } });
});
