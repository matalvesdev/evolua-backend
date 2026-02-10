"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import * as authApi from "@/lib/api/auth"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    setUser(data.user)
    return data
  }, [])

  const register = React.useCallback(async (email: string, password: string, fullName: string) => {
    return authApi.register(email, password, fullName)
  }, [])

  const logout = React.useCallback(async () => {
    await authApi.logout()
    setUser(null)
    router.push("/auth/login")
  }, [router])

  return { user, loading, login, register, logout }
}

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  return { user, loading }
}
