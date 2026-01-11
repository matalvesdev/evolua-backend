"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  getLoginUseCase,
  getRegisterUseCase,
  getGetCurrentUserUseCase,
  getChangePasswordUseCase,
} from "@/lib/core"
import type { LoginInput, RegisterInput, AuthOutput, AuthenticatedUser } from "@/lib/core"

// ============================================================================
// TYPES
// ============================================================================

export type ActionResult<T = void> = {
  success: true
  data: T
} | {
  success: false
  error: string
}

// ============================================================================
// LOGIN ACTION
// ============================================================================

export async function loginAction(input: LoginInput): Promise<ActionResult<AuthOutput>> {
  try {
    const useCase = await getLoginUseCase()
    const result = await useCase.execute(input)

    revalidatePath("/", "layout")

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle Zod validation errors
      if (error.name === "ZodError" && "issues" in error) {
        const zodError = error as unknown as { issues: { message: string }[] }
        return {
          success: false,
          error: zodError.issues[0]?.message ?? "Dados inválidos",
        }
      }
      // Mensagem genérica para não revelar informações
      if (error.message.includes("Invalid login")) {
        return { success: false, error: "E-mail ou senha incorretos" }
      }
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao fazer login" }
  }
}

// ============================================================================
// LOGIN AND REDIRECT ACTION
// ============================================================================

export async function loginAndRedirectAction(input: LoginInput): Promise<ActionResult<void>> {
  const result = await loginAction(input)

  if (result.success) {
    redirect("/dashboard")
  }

  return result as ActionResult<void>
}

// ============================================================================
// REGISTER ACTION
// ============================================================================

export async function registerAction(input: RegisterInput): Promise<ActionResult<AuthOutput>> {
  try {
    const useCase = await getRegisterUseCase()
    const result = await useCase.execute(input)

    revalidatePath("/", "layout")

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle Zod validation errors
      if (error.name === "ZodError" && "issues" in error) {
        const zodError = error as unknown as { issues: { message: string }[] }
        return {
          success: false,
          error: zodError.issues[0]?.message ?? "Dados inválidos",
        }
      }
      // Mensagem genérica para não revelar se email existe
      if (error.message.includes("already")) {
        return { success: false, error: "Não foi possível criar a conta" }
      }
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao criar conta" }
  }
}

// ============================================================================
// REGISTER AND REDIRECT ACTION
// ============================================================================

export async function registerAndRedirectAction(input: RegisterInput): Promise<ActionResult<void>> {
  const result = await registerAction(input)

  if (result.success && result.data.session) {
    redirect("/dashboard")
  }

  return result as ActionResult<void>
}

// ============================================================================
// GET CURRENT USER ACTION
// ============================================================================

export async function getCurrentUserAction(): Promise<ActionResult<AuthenticatedUser | null>> {
  try {
    const useCase = await getGetCurrentUserUseCase()
    const result = await useCase.execute()

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Erro ao buscar usuário" }
  }
}

// ============================================================================
// CHANGE PASSWORD ACTION
// ============================================================================

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
}): Promise<ActionResult<void>> {
  try {
    const useCase = await getChangePasswordUseCase()
    // ChangePasswordUseCase.execute takes two separate string arguments
    await useCase.execute(input.currentPassword, input.newPassword)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao alterar senha" }
  }
}

// ============================================================================
// LOGOUT ACTION
// ============================================================================

export async function logoutAction(): Promise<ActionResult<void>> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath("/", "layout")

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Erro ao fazer logout" }
  }
}

// ============================================================================
// LOGOUT AND REDIRECT ACTION
// ============================================================================

export async function logoutAndRedirectAction(): Promise<never> {
  await logoutAction()
  redirect("/auth/login")
}
