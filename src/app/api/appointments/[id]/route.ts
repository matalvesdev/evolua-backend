import { NextRequest, NextResponse } from "next/server"
import { 
  getGetAppointmentUseCase, 
  getConfirmAppointmentUseCase,
  getStartAppointmentUseCase,
  getCompleteAppointmentUseCase,
  getCancelAppointmentUseCase,
  getRescheduleAppointmentUseCase
} from "@/lib/core"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const useCase = await getGetAppointmentUseCase()
    const result = await useCase.execute(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error getting appointment:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar agendamento" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, ...data } = body

    let result

    switch (action) {
      case "confirm": {
        const useCase = await getConfirmAppointmentUseCase()
        result = await useCase.execute(id)
        break
      }
      case "start": {
        const useCase = await getStartAppointmentUseCase()
        result = await useCase.execute(id)
        break
      }
      case "complete": {
        const useCase = await getCompleteAppointmentUseCase()
        result = await useCase.execute({ appointmentId: id, sessionNotes: data.sessionNotes })
        break
      }
      case "cancel": {
        const useCase = await getCancelAppointmentUseCase()
        result = await useCase.execute({
          appointmentId: id,
          reason: data.reason,
          cancelledBy: data.cancelledBy,
          note: data.note,
        })
        break
      }
      case "reschedule": {
        const useCase = await getRescheduleAppointmentUseCase()
        result = await useCase.execute({
          appointmentId: id,
          newDateTime: new Date(data.newDateTime),
          reason: data.reason,
        })
        break
      }
      default:
        return NextResponse.json(
          { error: "Ação inválida" },
          { status: 400 }
        )
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error updating appointment:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar agendamento" },
      { status: 500 }
    )
  }
}
