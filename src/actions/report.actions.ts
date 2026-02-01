"use server"

import { revalidatePath } from "next/cache"
import {
  getCreateReportUseCase,
  getUpdateReportUseCase,
  getGetReportUseCase,
  getListReportsUseCase,
  getSubmitReportForReviewUseCase,
} from "@/lib/core"
import { getCurrentUserAction } from "./auth.actions"
import type {
  CreateReportInput,
  UpdateReportInput,
  ReportOutput,
} from "@/lib/core"
import type { Report } from "@/lib/core/domain/entities/report"

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
// CREATE REPORT ACTION
// ============================================================================

export async function createReportAction(
  input: CreateReportInput
): Promise<ActionResult<ReportOutput>> {
  try {
    // Precisamos do therapistId do usuário atual
    const userResult = await getCurrentUserAction()
    if (!userResult.success || !userResult.data) {
      return { success: false, error: "Usuário não autenticado" }
    }
    const therapistId = userResult.data.id

    const useCase = await getCreateReportUseCase()
    // CreateReportUseCase.execute takes (input, therapistId)
    const result = await useCase.execute(input, therapistId)

    revalidatePath("/dashboard/relatorios")
    revalidatePath(`/pacientes/${input.patientId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao criar relatório" }
  }
}

// ============================================================================
// UPDATE REPORT ACTION
// ============================================================================

export async function updateReportAction(
  id: string,
  input: Omit<UpdateReportInput, "id">
): Promise<ActionResult<ReportOutput>> {
  try {
    const useCase = await getUpdateReportUseCase()
    const result = await useCase.execute({ ...input, id })

    revalidatePath("/dashboard/relatorios")
    revalidatePath(`/relatorios/${id}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao atualizar relatório" }
  }
}

// ============================================================================
// GET REPORT ACTION
// ============================================================================

export async function getReportAction(
  id: string
): Promise<ActionResult<ReportOutput | null>> {
  try {
    const useCase = await getGetReportUseCase()
    // GetReportUseCase.execute takes a string reportId directly
    const result = await useCase.execute(id)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar relatório" }
  }
}

// ============================================================================
// LIST REPORTS ACTION
// ============================================================================

export async function listReportsAction(filters?: {
  patientId?: string
  therapistId?: string
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): Promise<ActionResult<PaginatedResult<Report>>> {
  try {
    const useCase = await getListReportsUseCase()
    // ListReportsUseCase expects SearchReportsInput directly
    const result = await useCase.execute({
      patientId: filters?.patientId,
      therapistId: filters?.therapistId,
      type: filters?.type as "evaluation" | "evolution" | "progress" | "discharge" | "monthly" | "school" | "medical" | "custom" | undefined,
      status: filters?.status as "draft" | "pending_review" | "approved" | "sent" | "archived" | undefined,
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
        data: result.reports,
        total: result.total,
        page: pageNum,
        totalPages: Math.ceil(result.total / limitNum),
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao listar relatórios" }
  }
}

// ============================================================================
// SUBMIT FOR REVIEW ACTION
// ============================================================================

export async function submitReportForReviewAction(
  reportId: string
): Promise<ActionResult<ReportOutput>> {
  try {
    const useCase = await getSubmitReportForReviewUseCase()
    // SubmitReportForReviewUseCase.execute takes reportId string
    const result = await useCase.execute(reportId)

    revalidatePath("/dashboard/relatorios")
    revalidatePath(`/relatorios/${reportId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao enviar relatório para revisão" }
  }
}

// ============================================================================
// GET PATIENT REPORTS ACTION
// ============================================================================

export async function getPatientReportsAction(
  patientId: string
): Promise<ActionResult<Report[]>> {
  try {
    const useCase = await getListReportsUseCase()
    const result = await useCase.execute({
      patientId,
      page: 1,
      limit: 100,
    })

    return {
      success: true,
      data: result.reports,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar relatórios do paciente" }
  }
}

// ============================================================================
// GET PENDING REPORTS ACTION
// ============================================================================

export async function getPendingReportsAction(
  therapistId?: string
): Promise<ActionResult<ReportListOutput[]>> {
  try {
    const useCase = await getListReportsUseCase()
    const result = await useCase.execute({
      therapistId,
      status: "pending_review",
      page: 1,
      limit: 50,
    })

    return {
      success: true,
      data: result.reports,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar relatórios pendentes" }
  }
}
