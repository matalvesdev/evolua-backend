// ============================================================================
// SUPABASE AUTH SERVICE
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"
import type { IAuthService } from "../../domain/repositories/user.repository"
import type { AuthenticatedUser } from "../../domain/entities/user"
import type { UserRole } from "../../domain/types"

export class SupabaseAuthService implements IAuthService {
  constructor(private supabase: SupabaseClient) {}

  async login(email: string, password: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.name ?? "",
      role: (data.user.user_metadata?.role as UserRole) ?? "therapist",
      clinicId: data.user.user_metadata?.clinic_id,
    }
  }

  async register(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error || !data.user) {
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      name: (metadata?.name as string) ?? "",
      role: (metadata?.role as UserRole) ?? "therapist",
      clinicId: metadata?.clinicId as string | undefined,
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name ?? "",
      role: (user.user_metadata?.role as UserRole) ?? "therapist",
      clinicId: user.user_metadata?.clinic_id,
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    // Supabase não tem método direto para verificar senha atual
    // Usamos updateUser diretamente
    void currentPassword // Ignorado no Supabase
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    })

    return !error
  }

  async resetPassword(email: string): Promise<boolean> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email)
    return !error
  }
}
