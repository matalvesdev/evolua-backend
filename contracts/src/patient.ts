import { z } from 'zod';
import { UuidSchema } from './common.js';

export const PatientStatusSchema = z.enum(['active', 'inactive', 'discharged', 'on_hold']);
export type PatientStatus = z.infer<typeof PatientStatusSchema>;

export const PatientAddressSchema = z
  .object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().optional(),
  })
  .partial();

export const MedicalHistorySchema = z
  .object({
    diagnoses: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .partial();

export const PatientSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  therapistId: UuidSchema.nullable(),
  name: z.string().min(2).max(200),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  birthDate: z.string().date().nullable(),
  cpf: z.string().nullable(),
  // DB armazena como String livre (sem enum); validamos enum apenas em inputs.
  status: z.string(),
  guardianName: z.string().nullable(),
  guardianPhone: z.string().nullable(),
  guardianRelationship: z.string().nullable(),
  address: PatientAddressSchema.nullable(),
  medicalHistory: MedicalHistorySchema.nullable(),
  startDate: z.string().datetime().nullable(),
  dischargeDate: z.string().datetime().nullable(),
  dischargeReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Patient = z.infer<typeof PatientSchema>;

export const CreatePatientSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(8).max(20).optional().nullable(),
  birthDate: z.string().date().optional().nullable(),
  cpf: z.string().min(11).max(14).optional().nullable(),
  therapistId: UuidSchema.optional().nullable(),
  status: PatientStatusSchema.default('active'),
  guardianName: z.string().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  guardianRelationship: z.string().optional().nullable(),
  address: PatientAddressSchema.optional().nullable(),
  medicalHistory: MedicalHistorySchema.optional().nullable(),
});
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = CreatePatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

export const ListPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  status: PatientStatusSchema.optional(),
  therapistId: UuidSchema.optional(),
  search: z.string().min(1).max(100).optional(),
});
export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;
