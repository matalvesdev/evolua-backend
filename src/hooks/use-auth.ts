"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  loginAction,
  registerAction,
  getCurrentUserAction,
  logoutAction,
  changePasswordAction,
} from "@/actions"
import type { LoginInput, RegisterInput, AuthenticatedUser } from "@/lib/core"

// ============================================================================
// USE AUTH HOOK
// ============================================================================

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Buscar usuário atual
  const fetchUser = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getCurrentUserAction()

    if (result.success) {
      setUser(result.data)
    } else {
      setError(result.error)
      setUser(null)
    }

    setLoading(false)
  }, [])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Login
  const login = React.useCallback(
    async (input: LoginInput) => {
      setLoading(true)
      setError(null)

      const result = await loginAction(input)

      if (result.success) {
        // AuthOutput.user has: id, email, name, role, avatarUrl
        // We need to fetch full user with getCurrentUserAction to get clinicId and crfa
        await fetchUser()
        router.push("/dashboard")
        router.refresh()
        return { success: true as const }
      } else {
        setError(result.error)
        setLoading(false)
        return { success: false as const, error: result.error }
      }
    },
    [router, fetchUser]
  )

  // Register
  const register = React.useCallback(
    async (input: RegisterInput) => {
      setLoading(true)
      setError(null)

      const result = await registerAction(input)

      if (result.success) {
        if (result.data.session) {
          await fetchUser()
          router.push("/dashboard")
          router.refresh()
        }
        return { success: true as const, needsEmailVerification: !result.data.session }
      } else {
        setError(result.error)
        setLoading(false)
        return { success: false as const, error: result.error }
      }
    },
    [router, fetchUser]
  )

  // Logout
  const logout = React.useCallback(async () => {
    setLoading(true)

    const result = await logoutAction()

    if (result.success) {
      setUser(null)
      router.push("/auth/login")
      router.refresh()
    }

    setLoading(false)
  }, [router])

  // Change password
  const changePassword = React.useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      setError(null)

      const result = await changePasswordAction(input)

      if (result.success) {
        return { success: true as const }
      } else {
        setError(result.error)
        return { success: false as const, error: result.error }
      }
    },
    []
  )

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    changePassword,
    refetch: fetchUser,
  }
}

// ============================================================================
// USE REQUIRE AUTH HOOK
// Redireciona para login se não autenticado
// ============================================================================

export function useRequireAuth(redirectTo = "/auth/login") {
  const auth = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      router.push(redirectTo)
    }
  }, [auth.loading, auth.isAuthenticated, router, redirectTo])

  return auth
}
