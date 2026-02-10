// ============================================================================
// WhatsApp Utility Functions - Pure functions for phone formatting,
// URL building, and message template application
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/**
 * Available message template types for WhatsApp communication.
 */
export type MessageTemplateType = 'reminder' | 'activity' | 'feedback' | 'free'

/**
 * Context data used to populate message template placeholders.
 */
export interface TemplateContext {
  patientName: string
  guardianName: string
  appointmentDate?: string
  appointmentTime?: string
  clinicName?: string
}

/**
 * Definition of a message template with metadata and content builder.
 */
export interface MessageTemplate {
  type: MessageTemplateType
  label: string
  icon: string
  buildContent: (context: TemplateContext) => string
}

/**
 * Result of phone number formatting/validation.
 */
export interface PhoneFormatResult {
  valid: boolean
  formatted: string
  error?: string
}

// ----------------------------------------------------------------------------
// Message Templates
// ----------------------------------------------------------------------------

export const MESSAGE_TEMPLATES: Record<MessageTemplateType, MessageTemplate> = {
  reminder: {
    type: 'reminder',
    label: 'Lembrete de Sessão',
    icon: 'calendar_clock',
    buildContent: (ctx) =>
      `Olá ${ctx.guardianName}! 😊\n\n` +
      `Passando para lembrar da sessão de fonoaudiologia de *${ctx.patientName}*:\n\n` +
      `📅 Data: ${ctx.appointmentDate}\n` +
      `🕐 Horário: ${ctx.appointmentTime}\n` +
      `📍 Local: ${ctx.clinicName}\n\n` +
      `Por favor, confirme a presença respondendo esta mensagem. Obrigada! 🙏`,
  },
  activity: {
    type: 'activity',
    label: 'Instrução de Atividade',
    icon: 'assignment',
    buildContent: (ctx) =>
      `Olá ${ctx.guardianName}! 😊\n\n` +
      `Seguem as atividades para praticar em casa com *${ctx.patientName}*:\n\n` +
      `📋 *Exercício:* [Nome do exercício]\n` +
      `🎯 *Objetivo:* [Descrever objetivo]\n\n` +
      `*Instruções:*\n` +
      `1. [Passo 1]\n` +
      `2. [Passo 2]\n` +
      `3. [Passo 3]\n\n` +
      `⏱️ *Frequência:* [Ex: 2x ao dia, 5 minutos]\n\n` +
      `Qualquer dúvida, estou à disposição! 💜`,
  },
  feedback: {
    type: 'feedback',
    label: 'Solicitar Feedback',
    icon: 'rate_review',
    buildContent: (ctx) =>
      `Olá ${ctx.guardianName}! 😊\n\n` +
      `Gostaria de saber como *${ctx.patientName}* está se saindo com as atividades em casa.\n\n` +
      `Poderia me contar:\n` +
      `1. Como foram os exercícios esta semana?\n` +
      `2. Notou alguma dificuldade?\n` +
      `3. Houve alguma melhora?\n\n` +
      `Seu feedback é muito importante para o tratamento! 💜`,
  },
  free: {
    type: 'free',
    label: 'Mensagem Livre',
    icon: 'edit_note',
    buildContent: (ctx) =>
      `Olá ${ctx.guardianName}! 😊\n\n`,
  },
}

// ----------------------------------------------------------------------------
// Phone Formatting
// ----------------------------------------------------------------------------

/**
 * Formats a Brazilian phone number for WhatsApp (wa.me) usage.
 *
 * Rules:
 * - Removes all non-numeric characters (parentheses, hyphens, spaces, dots)
 * - If the number already starts with 55 and has 12-13 digits, preserves it
 * - If the number has 10-11 digits (no country code), prepends 55
 * - If after cleanup the number has less than 10 digits, returns invalid
 * - Final format must match: /^55\d{10,11}$/
 *
 * @param phone - Raw phone number string
 * @returns PhoneFormatResult with validation status and formatted number
 */
export function formatPhoneForWhatsApp(phone: string): PhoneFormatResult {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '')

  // Check minimum digit count
  if (digits.length < 10) {
    return {
      valid: false,
      formatted: '',
      error: 'Número de telefone inválido. O número deve ter pelo menos 10 dígitos.',
    }
  }

  let formatted: string

  // If starts with 55 and has 12-13 digits, it already has the country code
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    formatted = digits
  }
  // If has 10-11 digits, add country code 55
  else if (digits.length === 10 || digits.length === 11) {
    formatted = `55${digits}`
  }
  // If starts with 55 but has unexpected length, still try to use it
  else if (digits.startsWith('55') && digits.length >= 12) {
    formatted = digits
  }
  // Other cases: try prepending 55 if it makes sense
  else {
    formatted = digits.startsWith('55') ? digits : `55${digits}`
  }

  // Validate final format: must be 55 followed by 10 or 11 digits
  const isValid = /^55\d{10,11}$/.test(formatted)

  if (!isValid) {
    return {
      valid: false,
      formatted: '',
      error: 'Número de telefone inválido. Formato esperado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.',
    }
  }

  return {
    valid: true,
    formatted,
  }
}

// ----------------------------------------------------------------------------
// URL Building
// ----------------------------------------------------------------------------

/**
 * Builds a WhatsApp Web URL (wa.me) with the given phone number and message.
 *
 * The message is encoded using encodeURIComponent to preserve special
 * characters, emojis, and line breaks.
 *
 * @param phone - Formatted phone number (digits only, with country code)
 * @param message - Message text to pre-fill in WhatsApp
 * @returns Complete wa.me URL string
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encodedMessage}`
}

// ----------------------------------------------------------------------------
// Template Application
// ----------------------------------------------------------------------------

/**
 * Applies a message template with the given context data, substituting
 * placeholders with actual values.
 *
 * @param template - The template type to apply
 * @param context - Context data for placeholder substitution
 * @returns The rendered message string with all placeholders replaced
 */
export function applyTemplate(template: MessageTemplateType, context: TemplateContext): string {
  const messageTemplate = MESSAGE_TEMPLATES[template]
  return messageTemplate.buildContent(context)
}
