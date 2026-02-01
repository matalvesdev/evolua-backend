// ============================================================================
// SUPABASE USER REPOSITORY
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"
import type { IUserRepository } from "../../domain/repositories/user.repository"
import type { User } from "../../domain/entities/user"

export class SupabaseUserRepository implements IUserRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data)
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data)
  }

  async create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const { data, error } = await this.supabase
      .from("users")
      .insert({
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        clinic_id: user.clinicId,
        crfa: user.crfa,
        phone: user.phone,
        avatar_url: user.avatarUrl,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const { data, error } = await this.supabase
      .from("users")
      .update({
        name: userData.name,
        role: userData.role,
        status: userData.status,
        clinic_id: userData.clinicId,
        crfa: userData.crfa,
        phone: userData.phone,
        avatar_url: userData.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("users").delete().eq("id", id)

    if (error) {
      throw new Error(error.message)
    }
  }

  private mapToEntity(data: Record<string, unknown>): User {
    return {
      id: data.id as string,
      email: data.email as string,
      name: data.name as string,
      role: data.role as User["role"],
      status: data.status as User["status"],
      clinicId: data.clinic_id as string | undefined,
      crfa: data.crfa as string | undefined,
      phone: data.phone as string | undefined,
      avatarUrl: data.avatar_url as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }
}
