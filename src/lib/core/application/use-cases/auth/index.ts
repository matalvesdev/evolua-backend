// ============================================================================
// AUTH USE CASES
// ============================================================================

import type { IAuthService, IUserRepository } from "../../domain/repositories/user.repository"
import type { LoginInput, RegisterInput, AuthOutput, ChangePasswordInput } from "../dtos/auth.dto"
import type { AuthenticatedUser } from "../../domain/entities/user"

export class LoginUseCase {
  constructor(
    private authService: IAuthService,
    private userRepository: IUserRepository
  ) {}

  async execute(input: LoginInput): Promise<AuthOutput> {
    try {
      const user = await this.authService.login(input.email, input.password)
      if (!user) {
        return { success: false, error: "Credenciais inválidas" }
      }
      return { success: true, user }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao fazer login" }
    }
  }
}

export class RegisterUseCase {
  constructor(
    private authService: IAuthService,
    private userRepository: IUserRepository
  ) {}

  async execute(input: RegisterInput): Promise<AuthOutput> {
    try {
      const existingUser = await this.userRepository.findByEmail(input.email)
      if (existingUser) {
        return { success: false, error: "Email já cadastrado" }
      }

      const user = await this.authService.register(input.email, input.password, {
        name: input.name,
        role: input.role ?? "therapist",
        clinicId: input.clinicId,
      })

      if (!user) {
        return { success: false, error: "Erro ao criar conta" }
      }

      return { success: true, user }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao registrar" }
    }
  }
}

export class GetCurrentUserUseCase {
  constructor(
    private authService: IAuthService,
    private userRepository: IUserRepository
  ) {}

  async execute(): Promise<AuthenticatedUser | null> {
    return this.authService.getCurrentUser()
  }
}

export class ChangePasswordUseCase {
  constructor(private authService: IAuthService) {}

  async execute(input: ChangePasswordInput): Promise<{ success: boolean; error?: string }> {
    try {
      const success = await this.authService.changePassword(input.currentPassword, input.newPassword)
      if (!success) {
        return { success: false, error: "Não foi possível alterar a senha" }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao alterar senha" }
    }
  }
}

export class LogoutUseCase {
  constructor(private authService: IAuthService) {}

  async execute(): Promise<void> {
    await this.authService.logout()
  }
}
