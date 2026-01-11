"use client"

import * as React from "react"
import Link from "next/link"
import { usePatients } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function PacientesPage() {
  const [search, setSearch] = React.useState("")
  const { patients, loading, error, page, totalPages, setPage, updateFilters } = usePatients()

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search })
    }, 300)
    return () => clearTimeout(timer)
  }, [search, updateFilters])

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header - Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Pacientes
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie seus pacientes
          </p>
        </div>
        <Link href="/dashboard/pacientes/novo" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
            + Novo Paciente
          </Button>
        </Link>
      </div>

      {/* Filtros - Responsivo */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Input
            placeholder="Buscar pacientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-sm"
          />
          <select
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm sm:text-base"
            onChange={(e) => updateFilters({ status: e.target.value || undefined })}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="discharged">Alta</option>
          </select>
        </div>
      </Card>

      {/* Lista de pacientes */}
      {loading ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : patients.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Nenhum paciente encontrado
          </p>
          <Link href="/dashboard/pacientes/novo">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Cadastrar primeiro paciente
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {patients.map((patient) => (
            <Card key={patient.id} className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm sm:text-base">
                      {patient.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/pacientes/${patient.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 block truncate"
                    >
                      {patient.name}
                    </Link>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {patient.age} anos
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-13 sm:pl-0">
                  <StatusBadge status={patient.status} />
                  <Link href={`/pacientes/${patient.id}`}>
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {/* Paginação - Responsiva */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3 sm:pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="text-xs sm:text-sm"
              >
                Anterior
              </Button>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: "Ativo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    inactive: { label: "Inativo", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    discharged: { label: "Alta", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  }

  const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}
