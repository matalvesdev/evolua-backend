"use client"

import { useState, useEffect, useRef } from "react"
import { useTasks } from "@/hooks/use-tasks"
import { usePatients } from "@/hooks/use-patients"
import type { Task } from "@/lib/api/tasks"

const ITEMS_PER_PAGE = 10

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  high: { label: "Alta", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" },
  medium: { label: "Média", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
  low: { label: "Baixa", color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  task: { label: "Tarefa", icon: "task_alt", color: "text-[#820AD1]" },
  reminder: { label: "Lembrete", icon: "notifications", color: "text-amber-500" },
}

const STATUS_TABS = [
  { key: "", label: "Todas", icon: "checklist" },
  { key: "pending", label: "Pendentes", dot: "bg-amber-500" },
  { key: "completed", label: "Concluídas", dot: "bg-green-500" },
  { key: "overdue", label: "Atrasadas", dot: "bg-red-500" },
]

function getPriorityInfo(p: string) { return PRIORITY_CONFIG[p] || PRIORITY_CONFIG.medium }
function getTypeInfo(t: string) { return TYPE_CONFIG[t] || TYPE_CONFIG.task }

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}
function isOverdue(task: Task) {
  return task.status === "pending" && task.dueDate && new Date(task.dueDate) < new Date()
}
function isDueToday(task: Task) {
  return task.status === "pending" && task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()
}

/* ─── Confirm Dialog ─── */
function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: string; confirmLabel: string
  onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-full text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg disabled:opacity-50">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Task Form Modal ─── */
function TaskFormModalInner({ onClose, task, patients }: {
  onClose: () => void; task?: Task
  patients: { id: string; name: string }[]
}) {
  const { createTask, updateTask, isCreating, isUpdating } = useTasks()
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task?.priority || "medium")
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
  const [patientId, setPatientId] = useState(task?.patientId || "")
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100)
  }, [])

  const handleSubmit = async () => {
    if (!title.trim()) return
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: "task" as const,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        patientId: patientId || undefined,
      }
      if (task) {
        await updateTask({ id: task.id, ...data })
      } else {
        await createTask(data)
      }
      onClose()
    } catch { /* */ }
  }

  const isBusy = isCreating || isUpdating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#820AD1]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#820AD1] text-[22px]">{task ? "edit" : "add_task"}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{task ? "Editar Tarefa" : "Nova Tarefa"}</h2>
              <p className="text-xs text-gray-500">{task ? "Atualize as informações" : "Preencha os campos abaixo"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Título *</label>
            <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Ligar para responsável do João"
              className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all" />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes adicionais..."
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all resize-y" />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Prioridade</label>
            <div className="flex gap-1.5">
              {(["low", "medium", "high"] as const).map((p) => {
                const info = getPriorityInfo(p)
                return (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${priority === p ? `${info.bg} ${info.color} ring-2 ring-current/20` : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                    {info.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Data de vencimento</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all" />
          </div>

          {/* Patient */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paciente (opcional)</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}
              className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all">
              <option value="">Nenhum</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm transition-all">Cancelar</button>
          <button onClick={handleSubmit} disabled={!title.trim() || isBusy}
            className="flex-2 h-11 rounded-xl bg-[#820AD1] hover:bg-[#6D08AF] text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isBusy ? (
              <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>Salvando...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">{task ? "check" : "add"}</span>{task ? "Atualizar" : "Criar Tarefa"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Task Form Modal Wrapper (remounts inner on task change for clean state) ─── */
function TaskFormModal({ open, onClose, task, patients }: {
  open: boolean; onClose: () => void; task?: Task
  patients: { id: string; name: string }[]
}) {
  if (!open) return null
  return <TaskFormModalInner key={task?.id || "new"} onClose={onClose} task={task} patients={patients} />
}

/* ─── Main Page ─── */
export default function TarefasPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)

  const { tasks, statistics, loading, toggleTaskStatus, deleteTask, isDeleting } = useTasks()
  const { patients } = usePatients()

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (statusFilter === "pending" && task.status !== "pending") return false
    if (statusFilter === "completed" && task.status !== "completed") return false
    if (statusFilter === "overdue" && !isOverdue(task)) return false

    // Priority filter
    if (priorityFilter && task.priority !== priorityFilter) return false

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      if (!task.title.toLowerCase().includes(q) && !(task.description || "").toLowerCase().includes(q)) return false
    }

    return true
  })

  // Pagination
  const totalFiltered = filteredTasks.length
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE)
  const paginatedTasks = filteredTasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await deleteTask(deleteTarget.id) } catch { /* */ }
    setDeleteTarget(null)
  }

  const handleToggle = async (taskId: string) => {
    try { await toggleTaskStatus(taskId) } catch { /* */ }
  }

  const handleEdit = (task: Task) => {
    setEditTask(task)
    setFormOpen(true)
  }

  const handleNewTask = () => {
    setEditTask(undefined)
    setFormOpen(true)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tarefas</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie suas tarefas e mantenha-se organizado</p>
          </div>
          <button onClick={handleNewTask}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#820AD1] hover:bg-[#6D08AF] text-white font-bold text-sm shadow-lg shadow-purple-200 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Tarefa
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", value: statistics.total, icon: "checklist", iconBg: "bg-[#820AD1]/10", iconColor: "text-[#820AD1]" },
            { label: "Pendentes", value: statistics.pending, icon: "schedule", iconBg: "bg-amber-50", iconColor: "text-amber-500" },
            { label: "Concluídas", value: statistics.completed, icon: "check_circle", iconBg: "bg-green-50", iconColor: "text-green-500" },
            { label: "Atrasadas", value: statistics.overdue, icon: "warning", iconBg: "bg-red-50", iconColor: "text-red-500" },
            { label: "Hoje", value: statistics.dueToday, icon: "today", iconBg: "bg-purple-50", iconColor: "text-purple-500" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined ${stat.iconColor} text-[20px]`}>{stat.icon}</span>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input type="text" placeholder="Buscar tarefas..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  statusFilter === tab.key
                    ? "bg-[#820AD1] text-white shadow-lg shadow-purple-200"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#820AD1]/30 hover:text-[#820AD1]"
                }`}>
                {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === tab.key ? "bg-white" : tab.dot}`} />}
                {tab.icon && <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: "", label: "Todas Prioridades" },
              { key: "high", label: "Alta" },
              { key: "medium", label: "Média" },
              { key: "low", label: "Baixa" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => { setPriorityFilter(tab.key); setPage(1) }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  priorityFilter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400">{totalFiltered} tarefa{totalFiltered !== 1 ? "s" : ""} encontrada{totalFiltered !== 1 ? "s" : ""}</p>

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-[#820AD1] text-3xl">progress_activity</span>
          </div>
        ) : paginatedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300 text-4xl">task_alt</span>
            </div>
            <p className="text-sm font-bold text-gray-400">Nenhuma tarefa encontrada</p>
            <p className="text-xs text-gray-400">{tasks.length === 0 ? "Crie sua primeira tarefa" : "Ajuste os filtros"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedTasks.map((task) => {
              const pi = getPriorityInfo(task.priority)
              const ti = getTypeInfo(task.type)
              const overdue = isOverdue(task)
              const today = isDueToday(task)
              const completed = task.status === "completed"

              return (
                <div key={task.id}
                  className={`glass-card rounded-xl p-4 flex items-start gap-3 sm:gap-4 transition-all group ${overdue ? "ring-1 ring-red-200 bg-red-50/30" : ""} ${completed ? "opacity-60" : ""}`}>
                  {/* Checkbox */}
                  <button onClick={() => handleToggle(task.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      completed ? "bg-[#820AD1] border-[#820AD1]" : "border-gray-300 hover:border-[#820AD1]/50"
                    }`}>
                    {completed && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-bold text-gray-900 ${completed ? "line-through text-gray-500" : ""}`}>{task.title}</p>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(task)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#820AD1] transition-colors">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteTarget(task)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Priority */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pi.bg} ${pi.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pi.dot}`} />
                        {pi.label}
                      </span>
                      {/* Type */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                        <span className={`material-symbols-outlined ${ti.color} text-[12px]`}>{ti.icon}</span>
                        {ti.label}
                      </span>
                      {/* Due date */}
                      {task.dueDate && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          overdue ? "text-red-500" : today ? "text-[#820AD1]" : "text-gray-400"
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">{overdue ? "warning" : today ? "today" : "schedule"}</span>
                          {overdue ? `Atrasada · ${formatDateShort(task.dueDate)}` : today ? "Hoje" : formatDateShort(task.dueDate)}
                        </span>
                      )}
                      {/* Completed date */}
                      {completed && task.completedAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          {formatDateShort(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile priority dot */}
                  <div className="sm:hidden shrink-0 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${pi.dot} block`} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) { pageNum = i + 1 }
              else if (page <= 3) { pageNum = i + 1 }
              else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i }
              else { pageNum = page - 2 + i }
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    page === pageNum ? "bg-[#820AD1] text-white shadow-lg shadow-purple-200" : "text-gray-500 hover:bg-gray-100"
                  }`}>
                  {pageNum}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <TaskFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTask(undefined) }}
        task={editTask}
        patients={patients?.map(p => ({ id: p.id, name: p.name })) || []}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Tarefa?"
        message="Esta ação não pode ser desfeita. A tarefa será removida permanentemente."
        confirmLabel={isDeleting ? "Excluindo..." : "Excluir"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={isDeleting}
      />
    </div>
  )
}
