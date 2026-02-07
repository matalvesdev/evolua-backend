import type { UserRole, UserStatus } from "../types"

export interface AuthenticatedUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  clinicId: string
  avatarUrl?: string
  status: UserStatus
}
