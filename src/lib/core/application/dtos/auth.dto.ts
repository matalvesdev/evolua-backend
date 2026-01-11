// ============================================================================
// AUTH DTOs
// ============================================================================

import type { UserRole } from "../../domain/types"

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  name: string
  role?: UserRole
  clinicId?: string
}

export interface AuthOutput {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    role: UserRole
  }
  error?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
