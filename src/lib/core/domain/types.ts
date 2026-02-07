// ============================================================================
// DOMAIN TYPES
// ============================================================================

export type UserRole = "admin" | "therapist" | "secretary" | "patient"
export type UserStatus = "active" | "inactive" | "pending"

export type PatientStatus = "active" | "inactive" | "discharged" | "on-hold"
export type PatientStatusType = PatientStatus
export const PatientStatusValues: PatientStatusType[] = ["active", "inactive", "discharged", "on-hold"]

export type AppointmentType = "regular" | "evaluation" | "reevaluation" | "discharge"
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"

export type CancellationReason =
  | "patient-request"
  | "therapist-unavailable"
  | "no-show"
  | "other"

export type CancelledBy = "patient" | "therapist" | "system"

export type ReportType = "evolution" | "evaluation" | "discharge" | "monthly"
export type ReportStatus = "draft" | "pending_review" | "reviewed" | "approved" | "sent"
