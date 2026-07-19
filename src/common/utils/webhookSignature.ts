import crypto from 'crypto';
import { timingSafeEqual } from './crypto';

// Standard HMAC-SHA256 webhook verification (the pattern Facebook, Google, and
// most webhook providers use, typically as a hex or "sha256=<hex>" header
// value). Comparing over the raw request body — never the parsed/re-serialized
// JSON — is required for the signature to match what the sender actually signed.
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.replace(/^sha256=/, '');
  return timingSafeEqual(expected, provided);
}
