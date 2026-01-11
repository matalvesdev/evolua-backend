// ============================================================================
// APPOINTMENT USE CASES
// ============================================================================

import type { IAppointmentRepository } from "../../domain/repositories/appointment.repository"
import type {
  CreateAppointmentInput,
  AppointmentOutput,
  AppointmentListOutput,
  SearchAppointmentsInput,
  CancelAppointmentInput,
  CompleteAppointmentInput,
  RescheduleAppointmentInput,
} from "../dtos/appointment.dto"

export class CreateAppointmentUseCase {
  constructor(
    private appointmentRepository: IAppointmentRepository,
    private getClinicId: () => string,
    private getPatientName: (id: string) => Promise<string>,
    private getTherapistName: (id: string) => Promise<string>
  ) {}

  async execute(input: CreateAppointmentInput): Promise<AppointmentOutput> {
    try {
      const [patientName, therapistName] = await Promise.all([
        this.getPatientName(input.patientId),
        this.getTherapistName(input.therapistId),
      ])

      const appointment = await this.appointmentRepository.create({
        clinicId: this.getClinicId(),
        patientId: input.patientId,
        patientName,
        therapistId: input.therapistId,
        therapistName,
        dateTime: new Date(input.dateTime),
        duration: input.duration,
        type: input.type,
        status: "scheduled",
        notes: input.notes,
      })

      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao criar agendamento" }
    }
  }
}

export class GetAppointmentUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(id: string): Promise<AppointmentOutput> {
    try {
      const appointment = await this.appointmentRepository.findById(id)
      if (!appointment) {
        return { success: false, error: "Agendamento não encontrado" }
      }
      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao buscar agendamento" }
    }
  }
}

export class ListAppointmentsUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(input: SearchAppointmentsInput): Promise<AppointmentListOutput> {
    try {
      const { appointments, total } = await this.appointmentRepository.findByClinicId(
        input.clinicId ?? "",
        {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        }
      )
      return { success: true, appointments, total }
    } catch (error) {
      return { success: false, appointments: [], total: 0, error: error instanceof Error ? error.message : "Erro ao listar agendamentos" }
    }
  }
}

export class CancelAppointmentUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(input: CancelAppointmentInput): Promise<AppointmentOutput> {
    try {
      const appointment = await this.appointmentRepository.cancel(
        input.id,
        input.reason,
        input.cancelledBy,
        input.notes
      )
      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao cancelar" }
    }
  }
}

export class CompleteAppointmentUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(input: CompleteAppointmentInput): Promise<AppointmentOutput> {
    try {
      const appointment = await this.appointmentRepository.complete(input.id, input.sessionNotes)
      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao completar" }
    }
  }
}

export class ConfirmAppointmentUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(id: string): Promise<AppointmentOutput> {
    try {
      const appointment = await this.appointmentRepository.confirm(id)
      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao confirmar" }
    }
  }
}

export class StartAppointmentUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(id: string): Promise<AppointmentOutput> {
    try {
      const appointment = await this.appointmentRepository.start(id)
      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao iniciar" }
    }
  }
}

export class RescheduleAppointmentUseCase {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async execute(input: RescheduleAppointmentInput): Promise<AppointmentOutput> {
    try {
      const appointment = await this.appointmentRepository.reschedule(
        input.id,
        new Date(input.newDateTime),
        input.newDuration
      )
      return { success: true, appointment }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao reagendar" }
    }
  }
}
