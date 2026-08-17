import { describe, expect, it } from 'vitest';
import { CreateMedicalRecordSchema, UpdateMedicalRecordSchema } from '@evolua/contracts';

const patientId = '5df12004-91bd-4d52-b559-3a4419e9ca1d';

describe('medical record contracts', () => {
  it('accepts a valid record creation', () => {
    expect(CreateMedicalRecordSchema.parse({ patientId, clinicalArea: 'voz', diagnosis: '' }))
      .toEqual({ patientId, clinicalArea: 'voz', diagnosis: '' });
  });

  it('rejects unknown clinical areas and fields', () => {
    expect(CreateMedicalRecordSchema.safeParse({ patientId, clinicalArea: 'cardiologia' }).success)
      .toBe(false);
    expect(UpdateMedicalRecordSchema.safeParse({ status: 'approved' }).success).toBe(false);
  });

  it('rejects invalid scale values', () => {
    expect(UpdateMedicalRecordSchema.safeParse({ scales: { grbas: { nested: true } } }).success)
      .toBe(false);
  });
});
