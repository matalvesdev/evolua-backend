// ============================================================================
// PATIENT USE CASES
// ============================================================================

import type { IPatientRepository } from "../../domain/repositories/patient.repository"
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PatientOutput,
  PatientListOutput,
  SearchPatientsInput,
  DischargePatientInput,
  ChangePatientStatusInput,
} from "../dtos/patient.dto"

export class CreatePatientUseCase {
  constructor(
    private patientRepository: IPatientRepository,
    private getClinicId: () => string
  ) {}

  async execute(input: CreatePatientInput): Promise<PatientOutput> {
    try {
      const patient = await this.patientRepository.create({
        clinicId: this.getClinicId(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        cpf: input.cpf,
        status: "active",
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianRelationship: input.guardianRelationship,
        address: input.address,
        medicalHistory: input.medicalHistory,
        therapistId: input.therapistId,
        startDate: new Date(),
      })

      return { success: true, patient }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao criar paciente" }
    }
  }
}

export class UpdatePatientUseCase {
  constructor(private patientRepository: IPatientRepository) {}

  async execute(input: UpdatePatientInput): Promise<PatientOutput> {
    try {
      const existing = await this.patientRepository.findById(input.id)
      if (!existing) {
        return { success: false, error: "Paciente não encontrado" }
      }

      const patient = await this.patientRepository.update(input.id, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        cpf: input.cpf,
        status: input.status,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianRelationship: input.guardianRelationship,
        address: input.address,
        medicalHistory: input.medicalHistory,
        therapistId: input.therapistId,
      })

      return { success: true, patient }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar paciente" }
    }
  }
}

export class GetPatientUseCase {
  constructor(private patientRepository: IPatientRepository) {}

  async execute(id: string): Promise<PatientOutput> {
    try {
      const patient = await this.patientRepository.findById(id)
      if (!patient) {
        return { success: false, error: "Paciente não encontrado" }
      }
      return { success: true, patient }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao buscar paciente" }
    }
  }
}

export class ListPatientsUseCase {
  constructor(private patientRepository: IPatientRepository) {}

  async execute(input: SearchPatientsInput): Promise<PatientListOutput> {
    try {
      const { patients, total } = await this.patientRepository.findByClinicId(
        input.clinicId ?? "",
        input
      )
      return { success: true, patients, total }
    } catch (error) {
      return { success: false, patients: [], total: 0, error: error instanceof Error ? error.message : "Erro ao listar pacientes" }
    }
  }
}

export class DeletePatientUseCase {
  constructor(private patientRepository: IPatientRepository) {}

  async execute(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.patientRepository.delete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir paciente" }
    }
  }
}

export class DischargePatientUseCase {
  constructor(private patientRepository: IPatientRepository) {}

  async execute(input: DischargePatientInput): Promise<PatientOutput> {
    try {
      const patient = await this.patientRepository.discharge(input.id, input.reason, input.notes)
      return { success: true, patient }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao dar alta" }
    }
  }
}

export class ChangePatientStatusUseCase {
  constructor(private patientRepository: IPatientRepository) {}

  async execute(input: ChangePatientStatusInput): Promise<PatientOutput> {
    try {
      const patient = await this.patientRepository.changeStatus(input.id, input.status)
      return { success: true, patient }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao alterar status" }
    }
  }
}
