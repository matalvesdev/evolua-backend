"use server"

import { revalidatePath } from "next/cache"
import {
  getCreateAppointmentUseCase,
  getGetAppointmentUseCase,
  getListAppointmentsUseCase,
  getCancelAppointmentUseCase,
  getCompleteAppointmentUseCase,
  getConfirmAppointmentUseCase,
  getStartAppointmentUseCase,
  getRescheduleAppointmentUseCase,
} from "@/lib/core"
import type {
  CreateAppointmentInput,
  AppointmentOutput,
} from "@/lib/core"
import type { Appointment } from "@/lib/core/domain/entities/appointment"

// ============================================================================
// TYPES
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  totalPages: number
}

// ============================================================================
// CREATE APPOINTMENT ACTION
// ============================================================================

export async function createAppointmentAction(
  input: CreateAppointmentInput
): Promise<ActionResult<AppointmentOutput>> {
  try {
    const useCase = await getCreateAppointmentUseCase()
    const result = await useCase.execute(input)

    revalidatePath("/dashboard/agendamentos")

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao criar agendamento" }
  }
}

// ============================================================================
// GET APPOINTMENT ACTION
// ============================================================================

export async function getAppointmentAction(
  id: string
): Promise<ActionResult<AppointmentOutput | null>> {
  try {
    const useCase = await getGetAppointmentUseCase()
    // GetAppointmentUseCase.execute takes a string appointmentId directly
    const result = await useCase.execute(id)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar agendamento" }
  }
}

// ============================================================================
// LIST APPOINTMENTS ACTION
// ============================================================================

export async function listAppointmentsAction(filters?: {
  patientId?: string
  therapistId?: string
  clinicId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): Promise<ActionResult<PaginatedResult<Appointment>>> {
  try {
    const useCase = await getListAppointmentsUseCase()
    // ListAppointmentsUseCase expects SearchAppointmentsInput directly
    const result = await useCase.execute({
      patientId: filters?.patientId,
      therapistId: filters?.therapistId,
      clinicId: filters?.clinicId,
      status: filters?.status as "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "rescheduled" | undefined,
      type: filters?.type as "evaluation" | "session" | "follow_up" | "reevaluation" | "parent_meeting" | "report_delivery" | undefined,
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 10,
    })

    const pageNum = filters?.page ?? 1
    const limitNum = filters?.limit ?? 10

    return {
      success: true,
      data: {
        data: result.appointments,
        total: result.total,
        page: pageNum,
        totalPages: Math.ceil(result.total / limitNum),
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao listar agendamentos" }
  }
}

// ============================================================================
// CANCEL APPOINTMENT ACTION
// ============================================================================

export async function cancelAppointmentAction(
  appointmentId: string,
  reason: "patient_request" | "therapist_request" | "illness" | "emergency" | "schedule_conflict" | "no_show" | "other",
  cancelledBy: "patient" | "therapist",
  note?: string
): Promise<ActionResult<AppointmentOutput>> {
  try {
    const useCase = await getCancelAppointmentUseCase()
    // CancelAppointmentUseCase expects { appointmentId, reason, cancelledBy, note? }
    const result = await useCase.execute({
      appointmentId,
      reason,
      cancelledBy,
      note,
    })

    revalidatePath("/dashboard/agendamentos")
    revalidatePath(`/agendamentos/${appointmentId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao cancelar agendamento" }
  }
}

// ============================================================================
// COMPLETE APPOINTMENT ACTION
// ============================================================================

export async function completeAppointmentAction(
  appointmentId: string,
  sessionNotes?: {
    objectives?: string
    activities?: string
    observations?: string
    patientResponse?: string
    homeExercises?: string
    nextSessionPlanning?: string
  }
): Promise<ActionResult<AppointmentOutput>> {
  try {
    const useCase = await getCompleteAppointmentUseCase()
    // CompleteAppointmentUseCase expects { appointmentId, sessionNotes? }
    const result = await useCase.execute({
      appointmentId,
      sessionNotes,
    })

    revalidatePath("/dashboard/agendamentos")
    revalidatePath(`/agendamentos/${appointmentId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao finalizar agendamento" }
  }
}

// ============================================================================
// CONFIRM APPOINTMENT ACTION
// ============================================================================

export async function confirmAppointmentAction(
  appointmentId: string
): Promise<ActionResult<AppointmentOutput>> {
  try {
    const useCase = await getConfirmAppointmentUseCase()
    // ConfirmAppointmentUseCase.execute takes appointmentId string
    const result = await useCase.execute(appointmentId)

    revalidatePath("/dashboard/agendamentos")
    revalidatePath(`/agendamentos/${appointmentId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao confirmar agendamento" }
  }
}

// ============================================================================
// START APPOINTMENT ACTION
// ============================================================================

export async function startAppointmentAction(
  appointmentId: string
): Promise<ActionResult<AppointmentOutput>> {
  try {
    const useCase = await getStartAppointmentUseCase()
    // StartAppointmentUseCase.execute takes appointmentId string
    const result = await useCase.execute(appointmentId)

    revalidatePath("/dashboard/agendamentos")
    revalidatePath(`/agendamentos/${appointmentId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao iniciar agendamento" }
  }
}

// ============================================================================
// RESCHEDULE APPOINTMENT ACTION
// ============================================================================

export async function rescheduleAppointmentAction(
  appointmentId: string,
  newDateTime: Date
): Promise<ActionResult<AppointmentOutput>> {
  try {
    const useCase = await getRescheduleAppointmentUseCase()
    const result = await useCase.execute({
      appointmentId,
      newDateTime,
    })

    revalidatePath("/dashboard/agendamentos")
    revalidatePath(`/agendamentos/${appointmentId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao reagendar" }
  }
}

// ============================================================================
// GET TODAY'S APPOINTMENTS ACTION
// ============================================================================

export async function getTodayAppointmentsAction(
  therapistId?: string
): Promise<ActionResult<AppointmentOutput[]>> {
  try {
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    const useCase = await getListAppointmentsUseCase()
    const result = await useCase.execute({
      therapistId,
      dateFrom: startOfDay,
      dateTo: endOfDay,
      page: 1,
      limit: 50,
    })

    return {
      success: true,
      data: result.appointments,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar agendamentos de hoje" }
  }
}

// ============================================================================
// GET WEEK APPOINTMENTS ACTION
// ============================================================================

export async function getWeekAppointmentsAction(
  startDate: Date,
  therapistId?: string
): Promise<ActionResult<AppointmentOutput[]>> {
  try {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 7)

    const useCase = await getListAppointmentsUseCase()
    const result = await useCase.execute({
      therapistId,
      dateFrom: startDate,
      dateTo: endDate,
      page: 1,
      limit: 100,
    })

    return {
      success: true,
      data: result.appointments,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar agendamentos da semana" }
  }
}
