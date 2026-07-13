import { generateSecureToken, hashToken, timingSafeEqual } from '../src/common/utils/crypto';

describe('crypto utils', () => {
  it('generates unique, high-entropy tokens', () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThan(32);
  });

  it('produces a deterministic hash for the same input', () => {
    const token = generateSecureToken();
    expect(hashToken(token)).toEqual(hashToken(token));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('a')).not.toEqual(hashToken('b'));
  });

  it('compares equal strings as equal in constant time', () => {
    expect(timingSafeEqual('same-value', 'same-value')).toBe(true);
  });

  it('compares different strings as different', () => {
    expect(timingSafeEqual('value-one', 'value-two')).toBe(false);
    expect(timingSafeEqual('short', 'a-much-longer-string')).toBe(false);
  });
});
