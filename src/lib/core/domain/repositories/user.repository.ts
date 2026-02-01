// ============================================================================
// USER REPOSITORY INTERFACE
// ============================================================================

import type { User, AuthenticatedUser } from "../entities/user"

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>
  update(id: string, data: Partial<User>): Promise<User>
  delete(id: string): Promise<void>
}

export interface IAuthService {
  login(email: string, password: string): Promise<AuthenticatedUser | null>
  register(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthenticatedUser | null>
  logout(): Promise<void>
  getCurrentUser(): Promise<AuthenticatedUser | null>
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>
  resetPassword(email: string): Promise<boolean>
}
