"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePatients } from "@/hooks"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { getInitials, getAvatarColor } from "@/components/patients/patient-utils"

const ITEMS_PER_PAGE = 10

const STATUS_TABS = [
  { key: "", label: "Todos", icon: "groups" },
  { key: "active", label: "Ativos", icon: "check_circle", dot: "bg-green-500" },
  { key: "inactive", label: "Inativos", icon: "pause_circle", dot: "bg-gray-400" },
  { key: "discharged", label: "Alta", icon: "logout", dot: "bg-slate-400" },
  { key: "on-hold", label: "Em Espera", icon: "hourglass_top", dot: "bg-orange-500" },
]

export default function PacientesPage() {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("")
  const [page, setPage] = React.useState(1)

  // Debounce search to avoid excessive API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when status filter changes
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const { patients, total, totalPages, loading } = usePatients({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  })

  // Separate query for active count
  const { patients: activePatients } = usePatients({ status: "active", limit: 1 })

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return undefined
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      active: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Ativo" },
      inactive: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", label: "Inativo" },
      discharged: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400", label: "Alta" },
      "on-hold": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Em Espera" },
    }
    return map[status] || map.active
  }

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(page * ITEMS_PER_PAGE, total)

  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 scroll-smooth pb-24">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Pacientes</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Gerencie seus pacientes e acompanhe a evolução do tratamento.
              </p>
            </div>
            <Link href="/dashboard/pacientes/novo">
              <button className="bg-[#820AD1] hover:bg-[#6D08AF] text-white text-xs sm:text-sm font-bold py-2.5 px-5 rounded-full transition-all shadow-lg shadow-purple-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Novo Paciente
              </button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon="groups" iconBg="bg-[#820AD1]/10" iconColor="text-[#820AD1]" label="Total" value={total} />
            <StatCard icon="check_circle" iconBg="bg-green-50" iconColor="text-green-600" label="Ativos" value={activePatients.length > 0 ? activePatients.length : patients.filter(p => p.status === "active").length} />
            <StatCard icon="calendar_month" iconBg="bg-blue-50" iconColor="text-blue-600" label="Esta Semana" value="-" />
            <StatCard icon="trending_up" iconBg="bg-amber-50" iconColor="text-amber-600" label="Novos (mês)" value="-" />
          </div>

          {/* Main Panel */}
          <div className="glass-panel rounded-2xl sm:rounded-3xl relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-[0.05] pointer-events-none">
              <div className="h-full w-full bg-linear-to-l from-[#820AD1]/20 to-transparent" />
            </div>

            <div className="p-4 sm:p-6 lg:p-8 relative z-10 flex flex-col gap-4 sm:gap-5">
              {/* Search + Status Tabs */}
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Search */}
                <div className="relative w-full group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#820AD1] transition-colors text-xl">search</span>
                  </div>
                  <input
                    className="input-glass block w-full pl-11 pr-10 py-2.5 sm:py-3 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#820AD1]/30 transition-all"
                    placeholder="Buscar por nome, e-mail, telefone ou CPF..."
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                        statusFilter === tab.key
                          ? "bg-[#820AD1] text-white shadow-md shadow-purple-200"
                          : "bg-white/70 text-gray-600 hover:bg-gray-50 border border-gray-100"
                      }`}
                    >
                      {tab.dot && <span className={`w-2 h-2 rounded-full ${statusFilter === tab.key ? "bg-white" : tab.dot}`} />}
                      {!tab.dot && <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{tab.icon}</span>}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results info */}
              {!loading && total > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span>Mostrando {startItem}-{endItem} de {total} pacientes</span>
                  {debouncedSearch && (
                    <span className="flex items-center gap-1 text-[#820AD1] font-medium">
                      <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                      Filtrado por &quot;{debouncedSearch}&quot;
                    </span>
                  )}
                </div>
              )}

              {/* Table Header (desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200/40">
                <div className="col-span-4">Paciente</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Telefone</div>
                <div className="col-span-2">Responsável</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>

              {/* Patient List */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3 text-gray-400">
                    <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                    <span className="text-sm font-medium">Carregando pacientes...</span>
                  </div>
                </div>
              ) : patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-gray-300">
                      {debouncedSearch ? "person_search" : "group_off"}
                    </span>
                  </div>
                  <p className="text-gray-600 font-medium text-sm mb-1">
                    {debouncedSearch ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    {debouncedSearch ? "Tente buscar com outros termos." : "Comece cadastrando seu primeiro paciente."}
                  </p>
                  {!debouncedSearch && (
                    <Link href="/dashboard/pacientes/novo">
                      <button className="bg-[#820AD1] hover:bg-[#6D08AF] text-white rounded-full px-6 py-2.5 text-sm font-bold shadow-lg shadow-purple-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Cadastrar Primeiro Paciente
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {patients.map((patient) => {
                    const age = calculateAge(patient.birthDate)
                    const sb = statusBadge(patient.status)
                    return (
                      <div
                        key={patient.id}
                        onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)}
                        className="glass-card-item rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer group hover:shadow-md hover:border-[#820AD1]/10 transition-all"
                      >
                        {/* Mobile Layout */}
                        <div className="flex md:hidden items-center gap-3">
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full bg-linear-to-br ${getAvatarColor(patient.name)} flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm`}>
                              {getInitials(patient.name)}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${sb.dot} border-2 border-white rounded-full`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-[#820AD1] transition-colors">{patient.name}</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                              {age !== undefined && <span>{age} anos</span>}
                              {age !== undefined && patient.guardianName && <span className="w-1 h-1 bg-gray-300 rounded-full" />}
                              {patient.guardianName && <span className="truncate">Resp: {patient.guardianName}</span>}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 ${sb.bg} ${sb.text} text-[10px] font-bold rounded-full shrink-0`}>{sb.label}</span>
                          <span className="material-symbols-outlined text-gray-300 text-[18px] shrink-0">chevron_right</span>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-4 flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className={`w-11 h-11 rounded-full bg-linear-to-br ${getAvatarColor(patient.name)} flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm`}>
                                {getInitials(patient.name)}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${sb.dot} border-2 border-white rounded-full`} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-[#820AD1] transition-colors">{patient.name}</h3>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                {age !== undefined && <span>{age} anos</span>}
                                {patient.email && (
                                  <>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <span className="truncate">{patient.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${sb.bg} ${sb.text} text-[11px] font-bold rounded-full`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />
                              {sb.label}
                            </span>
                          </div>
                          <div className="col-span-2 text-sm text-gray-600">
                            {patient.phone || <span className="text-gray-400 text-xs italic">Não informado</span>}
                          </div>
                          <div className="col-span-2 text-sm text-gray-600 truncate">
                            {patient.guardianName ? (
                              <span>{patient.guardianName}{patient.guardianRelationship && <span className="text-gray-400 text-xs"> ({patient.guardianRelationship})</span>}</span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Não informado</span>
                            )}
                          </div>
                          <div className="col-span-2 flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/pacientes/${patient.id}`} onClick={(e) => e.stopPropagation()}>
                              <button className="p-2 rounded-xl hover:bg-[#820AD1] hover:text-white text-gray-400 transition-colors" title="Ver Perfil">
                                <span className="material-symbols-outlined text-xl">visibility</span>
                              </button>
                            </Link>
                            <Link href={`/dashboard/pacientes/${patient.id}/editar`} onClick={(e) => e.stopPropagation()}>
                              <button className="p-2 rounded-xl hover:bg-purple-50 text-gray-400 hover:text-[#820AD1] transition-colors" title="Editar">
                                <span className="material-symbols-outlined text-xl">edit</span>
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100/50">
                  <span className="text-xs text-gray-500 order-2 sm:order-1">
                    Página {page} de {totalPages} ({total} pacientes)
                  </span>
                  <div className="flex items-center gap-1.5 order-1 sm:order-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-[#820AD1] hover:bg-[#820AD1]/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                      title="Primeira página"
                    >
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">first_page</span>
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-[#820AD1] hover:bg-[#820AD1]/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                      title="Página anterior"
                    >
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_left</span>
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`min-w-[32px] sm:min-w-[36px] h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                            page === pageNum
                              ? "bg-[#820AD1] text-white shadow-md shadow-purple-200"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-[#820AD1] hover:bg-[#820AD1]/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                      title="Próxima página"
                    >
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_right</span>
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-[#820AD1] hover:bg-[#820AD1]/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                      title="Última página"
                    >
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">last_page</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function StatCard({ icon, iconBg, iconColor, label, value }: { icon: string; iconBg: string; iconColor: string; label: string; value: number | string }) {
  return (
    <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3">
      <div className={`${iconBg} p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${iconColor} shrink-0`}>
        <span className="material-symbols-outlined text-[18px] sm:text-[22px]">{icon}</span>
      </div>
      <div>
        <span className="block text-lg sm:text-xl font-bold text-gray-900">{value}</span>
        <span className="block text-[10px] sm:text-xs text-gray-500 font-medium">{label}</span>
      </div>
    </div>
  )
}
