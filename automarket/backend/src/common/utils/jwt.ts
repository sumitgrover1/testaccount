import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors/AppError';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
}

const signOptions: SignOptions = {
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

const verifyOptions: VerifyOptions = {
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    ...signOptions,
    expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    ...signOptions,
    expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, verifyOptions) as unknown as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, verifyOptions) as unknown as { sub: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
