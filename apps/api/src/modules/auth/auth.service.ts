import type { User as PrismaUser, Clinic as PrismaClinic } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { supabaseAdmin, supabaseFor } from '../../lib/supabase.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import type {
  SignUpInput,
  SignInInput,
  UpdateProfileInput,
  AuthResponse,
  AuthSession,
  Profile,
} from '@evolua/contracts';

type ProfileRow = PrismaUser & { clinic: PrismaClinic | null };

function toAuthSession(s: {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
  token_type: string;
}): AuthSession {
  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresAt: s.expires_at ?? 0,
    tokenType: s.token_type,
  };
}

function profileToDTO(u: ProfileRow): Profile {
  return {
    id: u.id,
    clinicId: u.clinicId,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    crfa: u.crfa,
    role: u.role,
    avatarUrl: u.avatarUrl,
    areasAtuacao: u.areasAtuacao,
    objetivos: u.objetivos,
    onboardingCompleted: u.onboardingCompleted,
    onboardingStep: u.onboardingStep,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    clinic: u.clinic
      ? { id: u.clinic.id, name: u.clinic.name, crfa: u.clinic.crfa }
      : null,
  };
}

export class AuthService {
  /**
   * Signup via Supabase Auth. Trigger no banco cria o registro em `public.users`
   * (NestJS legacy depende deste mesmo trigger). Mantemos comportamento.
   */
  async signUp(input: SignUpInput): Promise<AuthResponse> {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName } },
    });

    if (error) {
      const e = new Error(error.message);
      (e as Error & { statusCode: number }).statusCode = error.status ?? 400;
      throw e;
    }
    if (!data.user) {
      const e = new Error('Signup failed — no user returned');
      (e as Error & { statusCode: number }).statusCode = 500;
      throw e;
    }

    if (emailService.isEnabled()) {
      emailService
        .sendWelcome(input.email, input.fullName)
        .catch((err) => logger.error({ err }, 'Welcome email failed'));
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? input.email },
      session: data.session ? toAuthSession(data.session) : null,
    };
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const resetLink = await this.#generateResetLink(email);
    if (resetLink) {
      await emailService.sendPasswordReset(email, resetLink);
    }
    // Sempre retorna sucesso para não vazar se email existe
    return { success: true };
  }

  async #generateResetLink(email: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${env.FRONTEND_URL}/nova-senha` },
    });
    if (error || !data.properties?.action_link) {
      logger.warn({ err: error, email }, 'Failed to generate reset link');
      return null;
    }
    return data.properties.action_link;
  }

  async signIn(input: SignInInput): Promise<AuthResponse> {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      const e = new Error(error.message);
      (e as Error & { statusCode: number }).statusCode = error.status ?? 401;
      throw e;
    }
    if (!data.user || !data.session) {
      const e = new Error('Invalid credentials');
      (e as Error & { statusCode: number }).statusCode = 401;
      throw e;
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? input.email },
      session: toAuthSession(data.session),
    };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      const e = new Error(error?.message ?? 'Refresh failed');
      (e as Error & { statusCode: number }).statusCode = 401;
      throw e;
    }
    return toAuthSession(data.session);
  }

  async signOut(accessToken: string): Promise<void> {
    const { error } = await supabaseFor(accessToken).auth.signOut();
    if (error) {
      const e = new Error(error.message);
      (e as Error & { statusCode: number }).statusCode = error.status ?? 400;
      throw e;
    }
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      include: { clinic: true },
    });
    return row ? profileToDTO(row) : null;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.crfa !== undefined && { crfa: input.crfa }),
        ...(input.areasAtuacao !== undefined && { areasAtuacao: input.areasAtuacao }),
        ...(input.objetivos !== undefined && { objetivos: input.objetivos }),
        ...(input.onboardingCompleted !== undefined && {
          onboardingCompleted: input.onboardingCompleted,
        }),
        ...(input.onboardingStep !== undefined && { onboardingStep: input.onboardingStep }),
      },
      include: { clinic: true },
    });
    return profileToDTO(row);
  }

  async changePassword(accessToken: string, newPassword: string): Promise<void> {
    const { error } = await supabaseFor(accessToken).auth.updateUser({
      password: newPassword,
    });
    if (error) {
      const e = new Error(error.message);
      (e as Error & { statusCode: number }).statusCode = error.status ?? 400;
      throw e;
    }
  }
}

export const authService = new AuthService();
