// ============================================================================
// CORE BOOTSTRAP
// Integração do Core DDD com o frontend Next.js
// ============================================================================

import { createClient } from "@/lib/supabase/server"
import { SupabaseAuthService } from "./infrastructure/services/auth.service"
import { SupabaseUserRepository } from "./infrastructure/repositories/user.repository"
import { SupabasePatientRepository } from "./infrastructure/repositories/patient.repository"
import { SupabaseAppointmentRepository } from "./infrastructure/repositories/appointment.repository"
import { SupabaseReportRepository } from "./infrastructure/repositories/report.repository"
import {
  LoginUseCase,
  RegisterUseCase,
  GetCurrentUserUseCase,
  ChangePasswordUseCase,
  LogoutUseCase,
} from "./application/use-cases/auth"
import {
  CreatePatientUseCase,
  UpdatePatientUseCase,
  GetPatientUseCase,
  ListPatientsUseCase,
  DeletePatientUseCase,
  DischargePatientUseCase,
  ChangePatientStatusUseCase,
} from "./application/use-cases/patient"
import {
  CreateAppointmentUseCase,
  GetAppointmentUseCase,
  ListAppointmentsUseCase,
  CancelAppointmentUseCase,
  CompleteAppointmentUseCase,
  ConfirmAppointmentUseCase,
  StartAppointmentUseCase,
  RescheduleAppointmentUseCase,
} from "./application/use-cases/appointment"
import {
  CreateReportUseCase,
  UpdateReportUseCase,
  GetReportUseCase,
  ListReportsUseCase,
  DeleteReportUseCase,
  SubmitReportForReviewUseCase,
} from "./application/use-cases/report"

// Domain Types
export * from "./domain/types"

// Domain Entities
export * from "./domain/entities"

// Domain Repositories (Interfaces)
export * from "./domain/repositories"

// Application DTOs
export * from "./application/dtos"

// Use Cases
export {
  LoginUseCase,
  RegisterUseCase,
  GetCurrentUserUseCase,
  ChangePasswordUseCase,
  LogoutUseCase,
} from "./application/use-cases/auth"

export {
  CreatePatientUseCase,
  UpdatePatientUseCase,
  GetPatientUseCase,
  ListPatientsUseCase,
  DeletePatientUseCase,
  DischargePatientUseCase,
  ChangePatientStatusUseCase,
} from "./application/use-cases/patient"

export {
  CreateAppointmentUseCase,
  GetAppointmentUseCase,
  ListAppointmentsUseCase,
  CancelAppointmentUseCase,
  CompleteAppointmentUseCase,
  ConfirmAppointmentUseCase,
  StartAppointmentUseCase,
  RescheduleAppointmentUseCase,
} from "./application/use-cases/appointment"

export {
  CreateReportUseCase,
  UpdateReportUseCase,
  GetReportUseCase,
  ListReportsUseCase,
  DeleteReportUseCase,
  SubmitReportForReviewUseCase,
} from "./application/use-cases/report"

// Infrastructure
export {
  SupabaseUserRepository,
  SupabasePatientRepository,
  SupabaseAppointmentRepository,
  SupabaseReportRepository,
} from "./infrastructure/repositories"

export { SupabaseAuthService } from "./infrastructure/services/auth.service"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getClinicIdFromSession(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.clinic_id ?? "default-clinic"
}

async function getPatientName(supabase: Awaited<ReturnType<typeof createClient>>, patientId: string): Promise<string> {
  const { data } = await supabase.from("patients").select("name").eq("id", patientId).single()
  return data?.name ?? "Paciente"
}

async function getTherapistName(supabase: Awaited<ReturnType<typeof createClient>>, therapistId: string): Promise<string> {
  const { data } = await supabase.from("users").select("name").eq("id", therapistId).single()
  return data?.name ?? "Terapeuta"
}

async function getTherapistInfo(supabase: Awaited<ReturnType<typeof createClient>>, therapistId: string): Promise<{ name: string; crfa: string }> {
  const { data } = await supabase.from("users").select("name, crfa").eq("id", therapistId).single()
  return { name: data?.name ?? "Terapeuta", crfa: data?.crfa ?? "" }
}

async function getClinicInfo(supabase: Awaited<ReturnType<typeof createClient>>, clinicId: string): Promise<{ id: string; name: string }> {
  const { data } = await supabase.from("clinics").select("id, name").eq("id", clinicId).single()
  return { id: data?.id ?? clinicId, name: data?.name ?? "Clínica" }
}

// ============================================================================
// USE CASE FACTORIES
// ============================================================================

// AUTH
export async function getLoginUseCase() {
  const supabase = await createClient()
  const authService = new SupabaseAuthService(supabase)
  const userRepository = new SupabaseUserRepository(supabase)
  return new LoginUseCase(authService, userRepository)
}

export async function getRegisterUseCase() {
  const supabase = await createClient()
  const authService = new SupabaseAuthService(supabase)
  const userRepository = new SupabaseUserRepository(supabase)
  return new RegisterUseCase(authService, userRepository)
}

export async function getGetCurrentUserUseCase() {
  const supabase = await createClient()
  const authService = new SupabaseAuthService(supabase)
  const userRepository = new SupabaseUserRepository(supabase)
  return new GetCurrentUserUseCase(authService, userRepository)
}

export async function getChangePasswordUseCase() {
  const supabase = await createClient()
  const authService = new SupabaseAuthService(supabase)
  return new ChangePasswordUseCase(authService)
}

// PATIENT
export async function getCreatePatientUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  const clinicId = await getClinicIdFromSession()
  return new CreatePatientUseCase(patientRepository, () => clinicId)
}

export async function getUpdatePatientUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  return new UpdatePatientUseCase(patientRepository)
}

export async function getGetPatientUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  return new GetPatientUseCase(patientRepository)
}

export async function getListPatientsUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  return new ListPatientsUseCase(patientRepository)
}

export async function getDeletePatientUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  return new DeletePatientUseCase(patientRepository)
}

export async function getDischargePatientUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  return new DischargePatientUseCase(patientRepository)
}

export async function getChangePatientStatusUseCase() {
  const supabase = await createClient()
  const patientRepository = new SupabasePatientRepository(supabase)
  return new ChangePatientStatusUseCase(patientRepository)
}

// APPOINTMENT
export async function getCreateAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  const clinicId = await getClinicIdFromSession()
  return new CreateAppointmentUseCase(
    appointmentRepository,
    () => clinicId,
    (id) => getPatientName(supabase, id),
    (id) => getTherapistName(supabase, id)
  )
}

export async function getGetAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new GetAppointmentUseCase(appointmentRepository)
}

export async function getListAppointmentsUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new ListAppointmentsUseCase(appointmentRepository)
}

export async function getCancelAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new CancelAppointmentUseCase(appointmentRepository)
}

export async function getCompleteAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new CompleteAppointmentUseCase(appointmentRepository)
}

export async function getConfirmAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new ConfirmAppointmentUseCase(appointmentRepository)
}

export async function getStartAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new StartAppointmentUseCase(appointmentRepository)
}

export async function getRescheduleAppointmentUseCase() {
  const supabase = await createClient()
  const appointmentRepository = new SupabaseAppointmentRepository(supabase)
  return new RescheduleAppointmentUseCase(appointmentRepository)
}

// REPORT
export async function getCreateReportUseCase() {
  const supabase = await createClient()
  const reportRepository = new SupabaseReportRepository(supabase)
  return new CreateReportUseCase(
    reportRepository,
    (id) => getPatientName(supabase, id),
    (id) => getTherapistInfo(supabase, id),
    (id) => getClinicInfo(supabase, id)
  )
}

export async function getUpdateReportUseCase() {
  const supabase = await createClient()
  const reportRepository = new SupabaseReportRepository(supabase)
  return new UpdateReportUseCase(reportRepository)
}

export async function getGetReportUseCase() {
  const supabase = await createClient()
  const reportRepository = new SupabaseReportRepository(supabase)
  return new GetReportUseCase(reportRepository)
}

export async function getListReportsUseCase() {
  const supabase = await createClient()
  const reportRepository = new SupabaseReportRepository(supabase)
  return new ListReportsUseCase(reportRepository)
}

export async function getDeleteReportUseCase() {
  const supabase = await createClient()
  const reportRepository = new SupabaseReportRepository(supabase)
  return new DeleteReportUseCase(reportRepository)
}

export async function getSubmitReportForReviewUseCase() {
  const supabase = await createClient()
  const reportRepository = new SupabaseReportRepository(supabase)
  return new SubmitReportForReviewUseCase(reportRepository)
}
