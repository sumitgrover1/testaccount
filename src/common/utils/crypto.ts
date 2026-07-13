import crypto from 'crypto';

// Refresh/reset tokens: a high-entropy random value is sent to the client, and
// only its SHA-256 hash is persisted. A leaked database therefore does not expose
// usable tokens, mirroring how passwords are handled.
export function generateSecureToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Constant-time comparison to avoid timing side-channels when comparing secrets.
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
