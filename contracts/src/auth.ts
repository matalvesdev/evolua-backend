import { z } from 'zod';
import { UuidSchema } from './common.js';

// Mantido para validação genérica (não derivado deste arquivo).
export const AuthUserSchema = z.object({
  id: UuidSchema,
  email: z.string().email().optional(),
  role: z.string().optional(),
  clinicId: UuidSchema.nullable().optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

// --- Inputs ---

export const SignUpSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(200),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const UpdateProfileSchema = z
  .object({
    fullName: z.string().min(2).max(200).optional(),
    phone: z.string().min(8).max(20).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    crfa: z.string().max(20).nullable().optional(),
    areasAtuacao: z.array(z.string().max(100)).max(50).optional(),
    objetivos: z.array(z.string().max(200)).max(50).optional(),
    onboardingCompleted: z.boolean().optional(),
    onboardingStep: z.number().int().min(0).max(20).optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// --- Outputs ---

export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number().int(),
  tokenType: z.string(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const AuthResponseSchema = z.object({
  user: z.object({
    id: UuidSchema,
    email: z.string().email(),
  }),
  session: AuthSessionSchema.nullable(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const ProfileSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema.nullable(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  crfa: z.string().nullable(),
  role: z.string(),
  avatarUrl: z.string().nullable(),
  areasAtuacao: z.array(z.string()),
  objetivos: z.array(z.string()),
  onboardingCompleted: z.boolean().nullable(),
  onboardingStep: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  clinic: z
    .object({
      id: UuidSchema,
      name: z.string(),
      crfa: z.string().nullable(),
    })
    .nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;
