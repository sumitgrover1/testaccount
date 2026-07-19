import {
  createPatientSchema,
  updatePatientSchema,
} from '../src/modules/patients/patient.validation';

describe('createPatientSchema', () => {
  const base = {
    fullName: 'Ada Lovelace',
    mobileNumber: '+919876543210',
    gender: 'FEMALE',
    city: 'Mumbai',
    state: 'Maharashtra',
  };

  it('accepts a valid patient with dateOfBirth', () => {
    const result = createPatientSchema.safeParse({ ...base, dateOfBirth: '1990-01-01' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid patient with age instead of dateOfBirth', () => {
    const result = createPatientSchema.safeParse({ ...base, age: 34 });
    expect(result.success).toBe(true);
  });

  it('rejects a patient with neither dateOfBirth nor age', () => {
    const result = createPatientSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid mobile number', () => {
    const result = createPatientSchema.safeParse({ ...base, age: 30, mobileNumber: 'not-a-phone' });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields such as a client-supplied status override', () => {
    const result = createPatientSchema.safeParse({ ...base, age: 30, status: 'INACTIVE' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('status');
    }
  });
});

describe('updatePatientSchema', () => {
  it('rejects an empty update payload', () => {
    const result = updatePatientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts a partial update', () => {
    const result = updatePatientSchema.safeParse({ city: 'Pune' });
    expect(result.success).toBe(true);
  });
});
