import { loginSchema, registerSchema } from '../src/modules/auth/auth.validation';

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'Student@Example.com',
      password: 'a-sufficiently-long-passphrase',
      firstName: 'Ada',
      lastName: "O'Brien",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('student@example.com');
    }
  });

  it('rejects a password shorter than the minimum length', () => {
    const result = registerSchema.safeParse({
      email: 'student@example.com',
      password: 'short1!',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields such as a client-supplied role', () => {
    const result = registerSchema.safeParse({
      email: 'student@example.com',
      password: 'a-sufficiently-long-passphrase',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'ADMIN',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('role');
    }
  });

  it('rejects invalid characters in names', () => {
    const result = registerSchema.safeParse({
      email: 'student@example.com',
      password: 'a-sufficiently-long-passphrase',
      firstName: '<script>alert(1)</script>',
      lastName: 'Lovelace',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ email: 'student@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing password', () => {
    const result = loginSchema.safeParse({ email: 'student@example.com' });
    expect(result.success).toBe(false);
  });
});
