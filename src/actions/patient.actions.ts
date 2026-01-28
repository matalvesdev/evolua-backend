"use server"

import { revalidatePath } from "next/cache"
import {
  getCreatePatientUseCase,
  getUpdatePatientUseCase,
  getGetPatientUseCase,
  getListPatientsUseCase,
  getDeletePatientUseCase,
  getDischargePatientUseCase,
  getChangePatientStatusUseCase,
} from "@/lib/core"
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PatientOutput,
} from "@/lib/core"
import type { Patient } from "@/lib/core/domain/entities/patient"

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
// CREATE PATIENT ACTION
// ============================================================================

export async function createPatientAction(
  input: CreatePatientInput
): Promise<ActionResult<PatientOutput>> {
  try {
    const useCase = await getCreatePatientUseCase()
    const result = await useCase.execute(input)

    revalidatePath("/dashboard/pacientes")

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao criar paciente" }
  }
}

// ============================================================================
// UPDATE PATIENT ACTION
// ============================================================================

export async function updatePatientAction(
  id: string,
  input: Omit<UpdatePatientInput, "id">
): Promise<ActionResult<PatientOutput>> {
  try {
    const useCase = await getUpdatePatientUseCase()
    const result = await useCase.execute({ ...input, id })

    revalidatePath("/dashboard/pacientes")
    revalidatePath(`/pacientes/${id}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao atualizar paciente" }
  }
}

// ============================================================================
// GET PATIENT ACTION
// ============================================================================

export async function getPatientAction(
  id: string
): Promise<ActionResult<PatientOutput | null>> {
  try {
    const useCase = await getGetPatientUseCase()
    // GetPatientUseCase.execute takes a string patientId directly
    const result = await useCase.execute(id)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao buscar paciente" }
  }
}

// ============================================================================
// LIST PATIENTS ACTION
// ============================================================================

export async function listPatientsAction(filters?: {
  search?: string
  status?: string
  therapistId?: string
  page?: number
  limit?: number
}): Promise<ActionResult<PaginatedResult<Patient>>> {
  try {
    const useCase = await getListPatientsUseCase()
    // ListPatientsUseCase expects SearchPatientsInput directly, not nested in filters
    const result = await useCase.execute({
      query: filters?.search,
      status: filters?.status as "active" | "inactive" | "discharged" | "on_hold" | undefined,
      therapistId: filters?.therapistId,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 10,
    })

    const pageNum = filters?.page ?? 1
    const limitNum = filters?.limit ?? 10

    return {
      success: true,
      data: {
        data: result.patients,
        total: result.total,
        page: pageNum,
        totalPages: Math.ceil(result.total / limitNum),
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao listar pacientes" }
  }
}

// ============================================================================
// DELETE PATIENT ACTION
// ============================================================================

export async function deletePatientAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    const useCase = await getDeletePatientUseCase()
    // DeletePatientUseCase.execute takes a string patientId directly
    await useCase.execute(id)

    revalidatePath("/dashboard/pacientes")

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao excluir paciente" }
  }
}

// ============================================================================
// DISCHARGE PATIENT ACTION
// ============================================================================

export async function dischargePatientAction(
  id: string,
  dischargeDate: Date,
  reason?: string,
  createDischargeReport: boolean = false
): Promise<ActionResult<PatientOutput>> {
  try {
    const useCase = await getDischargePatientUseCase()
    const result = await useCase.execute({
      patientId: id,
      dischargeDate,
      reason,
      createDischargeReport,
    })

    revalidatePath("/dashboard/pacientes")
    revalidatePath(`/pacientes/${id}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao dar alta ao paciente" }
  }
}

// ============================================================================
// REACTIVATE PATIENT ACTION
// ============================================================================

export async function reactivatePatientAction(
  id: string
): Promise<ActionResult<PatientOutput>> {
  try {
    const useCase = await getChangePatientStatusUseCase()
    const result = await useCase.execute({ id, status: "active" })

    revalidatePath("/dashboard/pacientes")
    revalidatePath(`/pacientes/${id}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "Erro ao reativar paciente" }
  }
}
