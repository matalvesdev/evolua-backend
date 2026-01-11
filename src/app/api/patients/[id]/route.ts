import { NextRequest, NextResponse } from "next/server"
import { getGetPatientUseCase, getUpdatePatientUseCase, getDeletePatientUseCase } from "@/lib/core"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const useCase = await getGetPatientUseCase()
    const result = await useCase.execute(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error getting patient:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar paciente" },
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

    const useCase = await getUpdatePatientUseCase()
    const result = await useCase.execute({ id, ...body })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error updating patient:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar paciente" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const useCase = await getDeletePatientUseCase()
    await useCase.execute(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[API] Error deleting patient:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir paciente" },
      { status: 500 }
    )
  }
}
