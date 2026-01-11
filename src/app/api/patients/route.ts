import { NextRequest, NextResponse } from "next/server"
import { getListPatientsUseCase } from "@/lib/core"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const query = searchParams.get("query") || undefined
    const status = searchParams.get("status") as "active" | "inactive" | "discharged" | undefined
    const therapistId = searchParams.get("therapistId") || undefined

    const useCase = await getListPatientsUseCase()
    const result = await useCase.execute({
      page,
      limit,
      query,
      status,
      therapistId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error listing patients:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar pacientes" },
      { status: 500 }
    )
  }
}
