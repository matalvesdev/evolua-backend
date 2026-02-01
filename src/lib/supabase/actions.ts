"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  isValidEmail,
  isStrongPassword,
  isValidName,
  isValidPhone,
  sanitizeString,
} from "@/lib/validations/auth"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get("email") as string)?.toLowerCase().trim()
  const password = formData.get("password") as string

  // Validações de segurança
  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios" }
  }

  if (!isValidEmail(email)) {
    return { error: "E-mail inválido" }
  }

  // Limite de tamanho para prevenir ataques
  if (password.length > 128) {
    return { error: "Senha muito longa" }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Mensagem genérica para não revelar se o email existe
    return { error: "E-mail ou senha incorretos" }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signup(data: {
  email: string
  password: string
  fullName: string
  phone?: string
}) {
  const supabase = await createClient()

  // Sanitização e validação
  const email = data.email?.toLowerCase().trim()
  const password = data.password
  const fullName = sanitizeString(data.fullName)
  const phone = data.phone ? sanitizeString(data.phone) : undefined

  // Validações
  if (!email || !password || !fullName) {
    return { error: "Todos os campos obrigatórios devem ser preenchidos" }
  }

  if (!isValidEmail(email)) {
    return { error: "E-mail inválido" }
  }

  if (!isValidName(fullName)) {
    return { error: "Nome deve ter entre 2 e 100 caracteres" }
  }

  const passwordCheck = isStrongPassword(password)
  if (!passwordCheck.isValid) {
    return { error: passwordCheck.errors[0] }
  }

  if (phone && !isValidPhone(phone)) {
    return { error: "Telefone inválido" }
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        onboarding_step: 1,
      },
    },
  })

  if (error) {
    // Mensagem genérica para não revelar se o email já existe
    if (error.message.includes("already registered")) {
      return { error: "Não foi possível criar a conta. Tente novamente." }
    }
    return { error: error.message }
  }

  // Verificar se o usuário foi criado e está autenticado
  if (!signUpData.user) {
    return { error: "Erro ao criar conta. Tente novamente." }
  }

  revalidatePath("/", "layout")
  redirect("/auth/cadastro/atuacao")
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/auth/login")
}

export async function updateUserProfile(data: Record<string, unknown>) {
  const supabase = await createClient()

  // Verificar se o usuário está autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { 
      error: "Sessão expirada. Por favor, faça login novamente para continuar o cadastro." 
    }
  }

  // Sanitizar dados
  const sanitizedData: Record<string, unknown> = {}
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string") {
      sanitizedData[key] = sanitizeString(data[key] as string)
    } else {
      sanitizedData[key] = data[key]
    }
  })

  const { error } = await supabase.auth.updateUser({
    data: sanitizedData,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
