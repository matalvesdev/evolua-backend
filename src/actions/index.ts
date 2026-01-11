// ============================================================================
// SERVER ACTIONS INDEX
// Re-exporta todas as Server Actions para uso no frontend
// ============================================================================

// Auth Actions
export {
  loginAction,
  loginAndRedirectAction,
  registerAction,
  registerAndRedirectAction,
  getCurrentUserAction,
  changePasswordAction,
  logoutAction,
  logoutAndRedirectAction,
} from "./auth.actions"

// Patient Actions
export {
  createPatientAction,
  updatePatientAction,
  getPatientAction,
  listPatientsAction,
  deletePatientAction,
  dischargePatientAction,
  reactivatePatientAction,
} from "./patient.actions"

// Appointment Actions
export {
  createAppointmentAction,
  getAppointmentAction,
  listAppointmentsAction,
  cancelAppointmentAction,
  completeAppointmentAction,
  confirmAppointmentAction,
  startAppointmentAction,
  rescheduleAppointmentAction,
  getTodayAppointmentsAction,
  getWeekAppointmentsAction,
} from "./appointment.actions"

// Report Actions
export {
  createReportAction,
  updateReportAction,
  getReportAction,
  listReportsAction,
  submitReportForReviewAction,
  getPatientReportsAction,
  getPendingReportsAction,
} from "./report.actions"

// Types
export type { ActionResult, PaginatedResult } from "./patient.actions"
