/**
 * Pure utility functions extracted from the patient profile page.
 *
 * These functions handle data transformation and status config lookups
 * for the patient profile header, appointment cards, and report cards.
 */

// ─── Patient Status Config ───────────────────────────────────────────────────

export interface StatusConfig {
  label: string
  color: string
  icon: string
  badgeBg: string
}

const patientStatusConfig: Record<string, StatusConfig> = {
  active: { label: "Ativo", color: "text-emerald-700", icon: "check_circle", badgeBg: "bg-emerald-100" },
  inactive: { label: "Inativo", color: "text-gray-600", icon: "pause_circle", badgeBg: "bg-gray-200" },
  discharged: { label: "Alta", color: "text-slate-600", icon: "verified", badgeBg: "bg-slate-200" },
  "on-hold": { label: "Em espera", color: "text-orange-700", icon: "schedule", badgeBg: "bg-orange-100" },
}

const defaultPatientStatus: StatusConfig = {
  label: "",
  color: "text-gray-800",
  icon: "help",
  badgeBg: "bg-gray-100",
}

/**
 * Returns the status config for a patient status string.
 * Falls back to a default config with the raw status as label.
 */
export function getPatientStatusConfig(status: string): StatusConfig {
  if (Object.prototype.hasOwnProperty.call(patientStatusConfig, status)) {
    return patientStatusConfig[status]
  }
  return { ...defaultPatientStatus, label: status }
}

/**
 * Returns the list of known patient status keys.
 */
export function getKnownPatientStatuses(): string[] {
  return Object.keys(patientStatusConfig)
}

// ─── Appointment Status Config ───────────────────────────────────────────────

export interface BadgeConfig {
  label: string
  color: string
  icon: string
}

const appointmentStatusConfig: Record<string, BadgeConfig> = {
  scheduled: { label: "Agendado", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "schedule" },
  confirmed: { label: "Confirmado", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "check" },
  "in-progress": { label: "Em andamento", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "play_arrow" },
  completed: { label: "Concluído", color: "bg-slate-50 text-slate-600 border-slate-200", icon: "done_all" },
  cancelled: { label: "Cancelado", color: "bg-red-50 text-red-600 border-red-200", icon: "close" },
}

const defaultAppointmentStatus: BadgeConfig = {
  label: "",
  color: "bg-gray-50 text-gray-600 border-gray-200",
  icon: "help",
}

/**
 * Returns the badge config for an appointment status string.
 * Falls back to a default config with the raw status as label.
 */
export function getAppointmentStatusConfig(status: string): BadgeConfig {
  if (Object.prototype.hasOwnProperty.call(appointmentStatusConfig, status)) {
    return appointmentStatusConfig[status]
  }
  return { ...defaultAppointmentStatus, label: status }
}

/**
 * Returns the list of known appointment status keys.
 */
export function getKnownAppointmentStatuses(): string[] {
  return Object.keys(appointmentStatusConfig)
}

// ─── Report Status Config ────────────────────────────────────────────────────

const reportStatusConfig: Record<string, BadgeConfig> = {
  draft: { label: "Rascunho", color: "bg-slate-50 text-slate-600 border-slate-200", icon: "edit_note" },
  pending_review: { label: "Pendente", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "hourglass_top" },
  reviewed: { label: "Revisado", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "rate_review" },
  approved: { label: "Aprovado", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "verified" },
  sent: { label: "Enviado", color: "bg-[#8A05BE]/10 text-[#8A05BE] border-[#8A05BE]/20", icon: "send" },
}

const defaultReportStatus: BadgeConfig = {
  label: "",
  color: "bg-gray-50 text-gray-600 border-gray-200",
  icon: "help",
}

/**
 * Returns the badge config for a report status string.
 * Falls back to a default config with the raw status as label.
 */
export function getReportStatusConfig(status: string): BadgeConfig {
  if (Object.prototype.hasOwnProperty.call(reportStatusConfig, status)) {
    return reportStatusConfig[status]
  }
  return { ...defaultReportStatus, label: status }
}

/**
 * Returns the list of known report status keys.
 */
export function getKnownReportStatuses(): string[] {
  return Object.keys(reportStatusConfig)
}

// ─── Report Type Formatting ──────────────────────────────────────────────────

const reportTypeMap: Record<string, string> = {
  evaluation: "Avaliação",
  evolution: "Evolução",
  progress: "Progresso",
  discharge: "Alta",
  monthly: "Mensal",
  school: "Escolar",
  medical: "Médico",
  custom: "Personalizado",
  resumo: "Resumo",
  encaminhamento: "Encaminhamento",
  mensal: "Mensal",
  avaliacao: "Avaliação",
  alta: "Alta",
}

/**
 * Maps a report type string to its Portuguese label.
 * Returns the raw type string if no mapping exists.
 */
export function formatReportType(type: string): string {
  return Object.hasOwn(reportTypeMap, type) ? reportTypeMap[type] : type
}

/**
 * Returns the list of known report type keys.
 */
export function getKnownReportTypes(): string[] {
  return Object.keys(reportTypeMap)
}

// ─── Date/Time Formatting ────────────────────────────────────────────────────

/**
 * Formats a date string to a localized long date (e.g., "segunda-feira, 1 de janeiro").
 */
export function formatAppointmentDate(dateTime: string): string {
  return new Date(dateTime).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

/**
 * Formats a date string to a localized time (e.g., "14:30").
 */
export function formatAppointmentTime(dateTime: string): string {
  return new Date(dateTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Formats a date string to a localized short date (e.g., "01/01/2024").
 */
export function formatReportDate(dateTime: string): string {
  return new Date(dateTime).toLocaleDateString("pt-BR")
}
