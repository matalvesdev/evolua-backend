// Validação de email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Validação de senha forte
export function isStrongPassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("A senha deve ter pelo menos 8 caracteres")
  }
  if (password.length > 128) {
    errors.push("A senha não pode ter mais de 128 caracteres")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra minúscula")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número")
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("A senha deve conter pelo menos um caractere especial")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Validação de telefone brasileiro
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "")
  return cleaned.length >= 10 && cleaned.length <= 11
}

// Sanitização básica de strings (remove scripts, etc)
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>]/g, "") // Remove < and >
    .slice(0, 500) // Limit length
}

// Validação de nome
export function isValidName(name: string): boolean {
  const sanitized = sanitizeString(name)
  return sanitized.length >= 2 && sanitized.length <= 100
}

// Rate limiting check (para usar com cookies ou headers)
export function generateRateLimitKey(identifier: string): string {
  return `rate_limit:${identifier}:${Math.floor(Date.now() / 60000)}`
}
