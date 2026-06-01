import { z } from 'zod';
import { UuidSchema } from './common.js';

export const ConsentRecordSchema = z.object({
  id: z.string().uuid(),
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  grantedBy: z.string(),
  purpose: z.string(),
  version: z.string(),
  granted: z.boolean(),
  ipAddress: z.string().nullable(),
  grantedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const GrantConsentSchema = z.object({
  patientId: z.string().uuid(),
  grantedBy: z.string().min(2),
  purpose: z.string().min(2),
  version: z.string().default('1.0'),
});
export type GrantConsentInput = z.infer<typeof GrantConsentSchema>;
