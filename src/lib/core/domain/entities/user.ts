// ============================================================================
// USER ENTITY
// ============================================================================

import type { UserRole, UserStatus } from "../types"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  clinicId?: string
  crfa?: string
  phone?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: UserRole
  clinicId?: string
}
