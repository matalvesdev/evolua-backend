"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useReportMutations, usePatients } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CreateReportInput, ReportType } from "@/lib/core"

export default function NovoRelatorioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedPatientId = searchParams.get("patientId")

  const { create, loading, error } = useReportMutations()
  const { patients, loading: patientsLoading } = usePatients({ limit: 100 })

  const [formData, setFormData] = React.useState<Omit<CreateReportInput, "therapistId">>({
    patientId: preSelectedPatientId || "",
    type: "evolution",
    title: "",
    content: "",
    period: {
      startDate: "",
      endDate: "",
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // O therapistId será preenchido pelo backend com o usuário atual
    const result = await create({
      ...formData,
      therapistId: "", // Será preenchido pelo server action
    })

    if (result.success) {
      router.push("/dashboard/relatorios")
    }
  }

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updatePeriod = (field: "startDate" | "endDate", value: string) => {
    setFormData((prev) => ({
      ...prev,
      period: { 
        startDate: prev.period?.startDate ?? "",
        endDate: prev.period?.endDate ?? "",
        [field]: value 
      },
    }))
  }

  const reportTypes: { value: ReportType; label: string; description: string }[] = [
    { value: "evolution", label: "Evolução", description: "Relatório de evolução do paciente" },
    { value: "evaluation", label: "Avaliação", description: "Relatório de avaliação inicial" },
    { value: "discharge", label: "Alta", description: "Relatório de alta do tratamento" },
    { value: "monthly", label: "Mensal", description: "Resumo mensal do tratamento" },
  ]

  // Templates por tipo de relatório
  const templates: Record<ReportType, string> = {
    evolution: `## Objetivos da Sessão


## Atividades Realizadas


## Resposta do Paciente


## Observações


## Planejamento Próxima Sessão

`,
    evaluation: `## Queixa Principal


## Histórico


## Avaliação


## Diagnóstico Fonoaudiológico


## Prognóstico


## Plano Terapêutico

`,
    discharge: `## Resumo do Tratamento


## Objetivos Alcançados


## Orientações Finais


## Recomendações

`,
    monthly: `## Período: 

## Resumo das Sessões


## Evolução Observada


## Objetivos em Andamento


## Planejamento do Próximo Mês

`,
  }

  const handleTypeChange = (type: ReportType) => {
    updateField("type", type)
    // Se o conteúdo está vazio, preencher com template
    if (!formData.content.trim()) {
      updateField("content", templates[type])
    }
  }

  // Sugerir título baseado no tipo
  const getTitleSuggestion = (type: ReportType, patientName: string) => {
    const today = new Date().toLocaleDateString("pt-BR")
    const suggestions: Record<ReportType, string> = {
      evolution: `Evolução - ${patientName} - ${today}`,
      evaluation: `Avaliação Fonoaudiológica - ${patientName}`,
      discharge: `Relatório de Alta - ${patientName}`,
      monthly: `Relatório Mensal - ${patientName} - ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
    }
    return suggestions[type]
  }

  const selectedPatient = patients.find((p) => p.id === formData.patientId)

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Novo Relatório
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Crie um novo relatório de fonoaudiologia
          </p>
        </div>
        <Link href="/dashboard/relatorios">
          <Button variant="ghost">← Voltar</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda - Configurações */}
          <div className="space-y-6">
            {/* Selecionar Paciente */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Paciente
              </h2>

              {patientsLoading ? (
                <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
              ) : (
                <div>
                  <Label htmlFor="patientId">Selecione o paciente *</Label>
                  <select
                    id="patientId"
                    value={formData.patientId}
                    onChange={(e) => {
                      updateField("patientId", e.target.value)
                      // Sugerir título
                      const patient = patients.find((p) => p.id === e.target.value)
                      if (patient && !formData.title) {
                        updateField("title", getTitleSuggestion(formData.type, patient.name))
                      }
                    }}
                    required
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </Card>

            {/* Tipo de Relatório */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tipo de Relatório
              </h2>

              <div className="space-y-2">
                {reportTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                      formData.type === type.value
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{type.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{type.description}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Período */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Período (opcional)
              </h2>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="startDate">Data inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.period?.startDate}
                    onChange={(e) => updatePeriod("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.period?.endDate}
                    onChange={(e) => updatePeriod("endDate", e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Coluna direita - Conteúdo */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="title">Título do Relatório *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Ex: Relatório de Evolução - João Silva"
                  required
                />
                {selectedPatient && !formData.title && (
                  <button
                    type="button"
                    onClick={() => updateField("title", getTitleSuggestion(formData.type, selectedPatient.name))}
                    className="text-xs text-purple-600 hover:text-purple-700 mt-1"
                  >
                    Usar sugestão: {getTitleSuggestion(formData.type, selectedPatient.name)}
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="content">Conteúdo *</Label>
                  {formData.content !== templates[formData.type] && (
                    <button
                      type="button"
                      onClick={() => updateField("content", templates[formData.type])}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      Usar template
                    </button>
                  )}
                </div>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  placeholder="Digite o conteúdo do relatório..."
                  rows={20}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Suporta formatação Markdown (## para títulos, **negrito**, etc.)
                </p>
              </div>
            </Card>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Link href="/dashboard/relatorios">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  // Salvar como rascunho (status padrão é draft)
                }}
              >
                Salvar Rascunho
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.patientId || !formData.title || !formData.content}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Salvando..." : "Criar Relatório"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
