"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Sincroniza os dados do onboarding salvos no localStorage com o perfil do usuário
 * Esta função deve ser chamada após o login bem-sucedido
 */
export async function syncOnboardingData(onboardingData: Record<string, unknown>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  try {
    // Atualizar metadata do usuário com os dados do onboarding
    const { error } = await supabase.auth.updateUser({
      data: onboardingData,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath("/", "layout")
    return { success: true }
  } catch {
    return { error: "Erro ao sincronizar dados" }
  }
}
