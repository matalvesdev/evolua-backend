// ============================================================================
// REPORT USE CASES
// ============================================================================

import type { IReportRepository } from "../../domain/repositories/report.repository"
import type {
  CreateReportInput,
  UpdateReportInput,
  ReportOutput,
  ReportListOutput,
  SearchReportsInput,
  SubmitReportForReviewInput,
} from "../dtos/report.dto"

export class CreateReportUseCase {
  constructor(
    private reportRepository: IReportRepository,
    private getPatientName: (id: string) => Promise<string>,
    private getTherapistInfo: (id: string) => Promise<{ name: string; crfa: string }>,
    private getClinicInfo: (id: string) => Promise<{ id: string; name: string }>
  ) {}

  async execute(input: CreateReportInput): Promise<ReportOutput> {
    try {
      const [patientName, therapistInfo] = await Promise.all([
        this.getPatientName(input.patientId),
        this.getTherapistInfo(input.therapistId),
      ])

      const clinicInfo = await this.getClinicInfo("")

      const report = await this.reportRepository.create({
        clinicId: clinicInfo.id,
        patientId: input.patientId,
        patientName,
        therapistId: input.therapistId,
        therapistName: therapistInfo.name,
        therapistCrfa: therapistInfo.crfa,
        type: input.type,
        status: "draft",
        title: input.title,
        content: input.content,
        period: input.period
          ? {
              startDate: new Date(input.period.startDate),
              endDate: new Date(input.period.endDate),
            }
          : undefined,
        appointmentId: input.appointmentId,
      })

      return { success: true, report }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao criar relatório" }
    }
  }
}

export class UpdateReportUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(input: UpdateReportInput): Promise<ReportOutput> {
    try {
      const existing = await this.reportRepository.findById(input.id)
      if (!existing) {
        return { success: false, error: "Relatório não encontrado" }
      }

      const report = await this.reportRepository.update(input.id, {
        title: input.title,
        content: input.content,
        period: input.period
          ? {
              startDate: new Date(input.period.startDate),
              endDate: new Date(input.period.endDate),
            }
          : undefined,
      })

      return { success: true, report }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar relatório" }
    }
  }
}

export class GetReportUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(id: string): Promise<ReportOutput> {
    try {
      const report = await this.reportRepository.findById(id)
      if (!report) {
        return { success: false, error: "Relatório não encontrado" }
      }
      return { success: true, report }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao buscar relatório" }
    }
  }
}

export class ListReportsUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(input: SearchReportsInput): Promise<ReportListOutput> {
    try {
      const { reports, total } = await this.reportRepository.findByClinicId(
        input.clinicId ?? "",
        {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        }
      )
      return { success: true, reports, total }
    } catch (error) {
      return { success: false, reports: [], total: 0, error: error instanceof Error ? error.message : "Erro ao listar relatórios" }
    }
  }
}

export class DeleteReportUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.reportRepository.delete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir relatório" }
    }
  }
}

export class SubmitReportForReviewUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(input: SubmitReportForReviewInput): Promise<ReportOutput> {
    try {
      const report = await this.reportRepository.submitForReview(input.id)
      return { success: true, report }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao enviar para revisão" }
    }
  }
}
