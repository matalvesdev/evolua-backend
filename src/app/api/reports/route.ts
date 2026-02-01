import { NextRequest, NextResponse } from "next/server"
import { getListReportsUseCase, getCreateReportUseCase } from "@/lib/core"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

async function getCurrentUserId() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const patientId = searchParams.get("patientId") || undefined
    const therapistId = searchParams.get("therapistId") || undefined
    const type = searchParams.get("type") as "evaluation" | "evolution" | "progress" | "discharge" | "monthly" | "school" | "medical" | "custom" | undefined
    const status = searchParams.get("status") as "draft" | "pending_review" | "approved" | "sent" | undefined
    const createdFrom = searchParams.get("createdFrom") ? new Date(searchParams.get("createdFrom")!) : undefined
    const createdTo = searchParams.get("createdTo") ? new Date(searchParams.get("createdTo")!) : undefined

    const useCase = await getListReportsUseCase()
    const result = await useCase.execute({
      page,
      limit,
      patientId,
      therapistId,
      type,
      status,
      createdFrom,
      createdTo,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[API] Error listing reports:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar relatórios" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const therapistId = await getCurrentUserId()
    
    if (!therapistId) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json()

    const useCase = await getCreateReportUseCase()
    const result = await useCase.execute(body, therapistId)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating report:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar relatório" },
      { status: 500 }
    )
  }
}
