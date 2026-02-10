// ============================================================================
// HOOKS INDEX
// Re-exporta todos os hooks para uso no frontend
// ============================================================================

// Auth Hooks
export { useAuth, useRequireAuth } from "./use-auth"

// Onboarding Hooks
export { useOnboardingStorage } from "./use-onboarding-storage"

// Patient Hooks
export { usePatients, usePatient, usePatientMutations } from "./use-patients"

// Appointment Hooks
export {
  useAppointments,
  useAppointment,
  useTodayAppointments,
  useWeekAppointments,
  useAppointmentMutations,
} from "./use-appointments"

// Report Hooks
export {
  useReports,
  useReport,
  usePatientReports,
  usePendingReports,
  useReportMutations,
} from "./use-reports"

// React Query Hooks (TanStack Query)
export * from "./queries"

// Audio Hooks
export { useAudioUpload } from "./use-audio-upload"
export { useAudioTranscription } from "./use-audio-transcription"

// Task Hooks
export { useTasks, useTask } from "./use-tasks"

// Transaction Hooks
export { useTransactions, useFinancialStats } from "./use-transactions"

// User Hook
export { useUser } from "./use-user"

// Message Hooks
export { useMessages, useCreateMessage } from "./use-messages"
