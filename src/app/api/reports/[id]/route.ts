import { NextRequest, NextResponse } from "next/server"
import { 
  getGetReportUseCase, 
  getUpdateReportUseCase, 
  getDeleteReportUseCase,
  getSubmitReportForReviewUseCase
} from "@/lib/core"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const useCase = await getGetReportUseCase()
    const result = await useCase.execute(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error getting report:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar relatório" },
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
      case "update": {
        const useCase = await getUpdateReportUseCase()
        result = await useCase.execute({ id, ...data })
        break
      }
      case "submit_for_review": {
        const useCase = await getSubmitReportForReviewUseCase()
        result = await useCase.execute(id)
        break
      }
      default:
        // Default: update
        const updateUseCase = await getUpdateReportUseCase()
        result = await updateUseCase.execute({ id, ...body })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error updating report:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar relatório" },
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

    const useCase = await getDeleteReportUseCase()
    await useCase.execute(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[API] Error deleting report:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir relatório" },
      { status: 500 }
    )
  }
}
