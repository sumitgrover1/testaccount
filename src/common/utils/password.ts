import argon2 from 'argon2';

// argon2id is the OWASP-recommended password hashing algorithm (resistant to both
// GPU cracking and side-channel attacks). Parameters follow OWASP's minimum
// recommendation for interactive login; tune memoryCost upward if server RAM allows.
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed hash or verification error — treat as a failed match, never throw
    // out of an auth check.
    return false;
  }
}

const PASSWORD_MIN_LENGTH = 12;

// Enforced alongside the zod schema for defense in depth; complexity rules follow
// NIST 800-63B guidance (length over composition rules), with a minimum length
// well above legacy 8-character policies.
export function isPasswordStrongEnough(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export { PASSWORD_MIN_LENGTH };
