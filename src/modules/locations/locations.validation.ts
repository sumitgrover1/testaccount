import { z } from 'zod';

export const pincodeParamSchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Invalid pincode'),
});
export type PincodeParam = z.infer<typeof pincodeParamSchema>;
