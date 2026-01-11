import { NextRequest, NextResponse } from "next/server"
import { getListAppointmentsUseCase, getCreateAppointmentUseCase } from "@/lib/core"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const patientId = searchParams.get("patientId") || undefined
    const therapistId = searchParams.get("therapistId") || undefined
    const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined
    const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined
    const status = searchParams.get("status") as "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | undefined

    const useCase = await getListAppointmentsUseCase()
    const result = await useCase.execute({
      page,
      limit,
      patientId,
      therapistId,
      dateFrom,
      dateTo,
      status,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error listing appointments:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar agendamentos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const useCase = await getCreateAppointmentUseCase()
    const result = await useCase.execute(body)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating appointment:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar agendamento" },
      { status: 500 }
    )
  }
}
