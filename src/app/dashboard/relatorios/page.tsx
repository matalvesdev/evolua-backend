"use client"

import * as React from "react"
import Link from "next/link"
import { useReports, usePendingReports, useReportMutations } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function RelatoriosPage() {
  const [view, setView] = React.useState<"pending" | "all">("pending")
  const { reports: pendingReports, loading: pendingLoading } = usePendingReports()
  const { reports: allReports, loading: allLoading, updateFilters } = useReports()
  const reportMutations = useReportMutations()
  void reportMutations // Suprimir warning de não utilização

  const reports = view === "pending" ? pendingReports : allReports
  const loading = view === "pending" ? pendingLoading : allLoading

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Relatórios
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie relatórios de evolução e avaliação
          </p>
        </div>
        <Link href="/dashboard/relatorios/novo">
          <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
            + Novo Relatório
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setView("pending")}
          className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            view === "pending"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Pendentes ({pendingReports.length})
        </button>
        <button
          onClick={() => setView("all")}
          className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            view === "all"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Todos
        </button>
      </div>

      {/* Filtros (apenas para view "all") */}
      {view === "all" && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              onChange={(e) => updateFilters({ type: e.target.value || undefined })}
            >
              <option value="">Todos os tipos</option>
              <option value="evolution">Evolução</option>
              <option value="evaluation">Avaliação</option>
              <option value="discharge">Alta</option>
              <option value="monthly">Mensal</option>
            </select>
            <select
              className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              onChange={(e) => updateFilters({ status: e.target.value || undefined })}
            >
              <option value="">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="pending_review">Pendente de revisão</option>
              <option value="reviewed">Revisado</option>
              <option value="approved">Aprovado</option>
              <option value="sent">Enviado</option>
            </select>
          </div>
        </Card>
      )}

      {/* Lista de relatórios */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {view === "pending"
              ? "Nenhum relatório pendente de revisão"
              : "Nenhum relatório encontrado"}
          </p>
          <Link href="/dashboard/relatorios/novo">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Criar relatório
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/relatorios/${report.id}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    {report.title}
                  </Link>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {report.patientName} • {formatType(report.type)} •{" "}
                    {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={report.status} />
                  <Link href={`/relatorios/${report.id}`}>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    pending_review: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    reviewed: { label: "Revisado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    sent: { label: "Enviado", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  }

  const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

function formatType(type: string): string {
  const types: Record<string, string> = {
    evolution: "Evolução",
    evaluation: "Avaliação",
    discharge: "Alta",
    monthly: "Mensal",
  }
  return types[type] ?? type
}
