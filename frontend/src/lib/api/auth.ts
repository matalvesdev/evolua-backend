// ============================================================================
// AUTH API
// ============================================================================

import { createClient } from "@/lib/supabase/client"
import { api } from "./client"

export interface AuthenticatedUser {
  id: string
  email: string
  fullName: string
  role: string
  clinicId: string
  avatarUrl?: string
}

export async function login(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function register(email: string, password: string, fullName: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    return await api.get<AuthenticatedUser>("/auth/profile")
  } catch {
    return null
  }
}

export async function updateProfile(data: { fullName?: string; phone?: string; avatarUrl?: string }) {
  return api.patch("/auth/profile", data)
}

export async function changePassword(newPassword: string) {
  return api.post("/auth/change-password", { newPassword })
}
