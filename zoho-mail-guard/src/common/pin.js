/**
 * Admin PIN hashing (PBKDF2-SHA256 via WebCrypto).
 *
 * The PIN protects the options page from the person sitting at the laptop.
 * It is not a secret shared with any server, and it never leaves the device.
 */
const ITERATIONS = 210000;
const KEY_BITS = 256;

const enc = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function derive(pin, saltBytes, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
    key,
    KEY_BITS,
  );
  return toHex(bits);
}

/** @returns {Promise<{salt: string, hash: string, iterations: number}>} */
export async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    salt: toHex(salt),
    hash: await derive(pin, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
}

/** Constant-time-ish comparison of the derived hash against a stored record. */
export async function verifyPin(pin, record) {
  if (!record || !record.salt || !record.hash) return false;
  const candidate = await derive(pin, fromHex(record.salt), record.iterations || ITERATIONS);
  if (candidate.length !== record.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    diff |= candidate.charCodeAt(i) ^ record.hash.charCodeAt(i);
  }
  return diff === 0;
}
