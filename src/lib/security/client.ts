// Utilitários de segurança para o cliente

// Limpar dados sensíveis da memória (para forms)
export function clearSensitiveData(data: Record<string, unknown>): void {
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string") {
      ;(data as Record<string, string>)[key] = ""
    }
  })
}

// Verificar se está em ambiente de produção
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

// Gerar CSRF token simples (para forms adicionais)
export function generateCSRFToken(): string {
  if (typeof window === "undefined") return ""
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  )
}

// Verificar se a URL é segura (mesmo domínio)
export function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}

// Limitar taxa de cliques (debounce para botões de submit)
export function createClickLimiter(limitMs: number = 1000) {
  let lastClick = 0
  return (): boolean => {
    const now = Date.now()
    if (now - lastClick < limitMs) {
      return false
    }
    lastClick = now
    return true
  }
}

// Máscara de dados sensíveis para logs
export function maskSensitiveData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = ["password", "senha", "token", "secret", "key", "credit", "card"]
  const masked: Record<string, unknown> = {}

  Object.keys(data).forEach((key) => {
    const isSensitive = sensitiveKeys.some((sk) =>
      key.toLowerCase().includes(sk)
    )
    masked[key] = isSensitive ? "***MASKED***" : data[key]
  })

  return masked
}
