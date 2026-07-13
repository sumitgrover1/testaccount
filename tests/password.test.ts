import { hashPassword, isPasswordStrongEnough, verifyPassword } from '../src/common/utils/password';

describe('password utils', () => {
  it('hashes and verifies a matching password', async () => {
    const hash = await hashPassword('CorrectHorseBatteryStaple123!');
    await expect(verifyPassword(hash, 'CorrectHorseBatteryStaple123!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('CorrectHorseBatteryStaple123!');
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('never returns the plaintext in the hash', async () => {
    const plaintext = 'CorrectHorseBatteryStaple123!';
    const hash = await hashPassword(plaintext);
    expect(hash).not.toContain(plaintext);
  });

  it('treats a malformed hash as a failed verification instead of throwing', async () => {
    await expect(verifyPassword('not-a-real-hash', 'anything')).resolves.toBe(false);
  });

  it('enforces the minimum password length policy', () => {
    expect(isPasswordStrongEnough('short')).toBe(false);
    expect(isPasswordStrongEnough('a-sufficiently-long-passphrase')).toBe(true);
  });
});
