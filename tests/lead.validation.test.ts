import {
  changeLeadStatusSchema,
  convertLeadSchema,
  createLeadSchema,
} from '../src/modules/leads/lead.validation';

describe('createLeadSchema', () => {
  it('accepts a minimal valid lead', () => {
    const result = createLeadSchema.safeParse({
      fullName: 'Priya Sharma',
      mobileNumber: '9876543210',
      source: 'FACEBOOK_ADS',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid lead source', () => {
    const result = createLeadSchema.safeParse({
      fullName: 'Priya Sharma',
      mobileNumber: '9876543210',
      source: 'TIKTOK_ADS',
    });
    expect(result.success).toBe(false);
  });
});

describe('changeLeadStatusSchema', () => {
  it('accepts a valid pipeline status', () => {
    const result = changeLeadStatusSchema.safeParse({ status: 'INTERESTED' });
    expect(result.success).toBe(true);
  });

  it('accepts CONVERTED at the schema level (service layer rejects it)', () => {
    // The zod schema only checks it's a valid enum value; the business rule
    // that CONVERTED must go through /convert is enforced in lead.service.ts.
    const result = changeLeadStatusSchema.safeParse({ status: 'CONVERTED' });
    expect(result.success).toBe(true);
  });
});

describe('convertLeadSchema', () => {
  it('requires either dateOfBirth or age', () => {
    const result = convertLeadSchema.safeParse({ gender: 'MALE', city: 'Delhi', state: 'Delhi' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid conversion payload', () => {
    const result = convertLeadSchema.safeParse({
      gender: 'MALE',
      age: 28,
      city: 'Delhi',
      state: 'Delhi',
    });
    expect(result.success).toBe(true);
  });
});
