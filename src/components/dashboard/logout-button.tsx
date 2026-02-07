"use client"

import { useState } from "react"
import { signout } from "@/lib/supabase/actions"

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await signout()
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined">
        {isLoading ? "progress_activity" : "logout"}
      </span>
      <span className="hidden lg:block font-medium">
        {isLoading ? "Saindo..." : "Sair"}
      </span>
    </button>
  )
}
