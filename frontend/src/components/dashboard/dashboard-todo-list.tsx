"use client"

import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTasks } from "@/hooks"
import { TaskForm } from "@/components/tasks"
import { updateTask } from "@/lib/api/tasks"
import Link from "next/link"

export function DashboardTodoList() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { tasks: pendingTasks, loading: loadingPending } = useTasks({
    type: "task",
    status: "pending",
    limit: 5,
  })

  const { tasks: completedTasks, loading: loadingCompleted } = useTasks({
    type: "task",
    status: "completed",
    limit: 3,
  })

  const loading = loadingPending || loadingCompleted

  const toggleTask = useCallback(async (taskId: string, currentStatus: "pending" | "completed") => {
    setTogglingIds((prev) => new Set(prev).add(taskId))
    try {
      const newStatus = currentStatus === "completed" ? "pending" : "completed"
      await updateTask(taskId, {
        status: newStatus,
        completed: newStatus === "completed",
      })
      await queryClient.invalidateQueries({ queryKey: ["tasks"] })
    } catch {
      // silently handle
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }, [queryClient])

  return (
    <>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
            </div>
            Minha To-Do List
          </h3>
          <button
            onClick={() => setIsFormOpen(true)}
            className="text-xs font-bold text-[#8A05BE] hover:bg-[#8A05BE]/5 px-2 py-1 rounded-md transition-colors"
          >
            + Add
          </button>
        </div>
        <div className="space-y-1.5 mb-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
          ) : pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">Nenhuma tarefa</p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="text-xs text-[#8A05BE] hover:underline"
              >
                Criar primeira tarefa
              </button>
            </div>
          ) : (
            <>
              {/* Pending tasks */}
              {pendingTasks.map((task) => {
                const isToggling = togglingIds.has(task.id)
                return (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-all group"
                  >
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#8A05BE] focus:ring-[#8A05BE] w-4 h-4 cursor-pointer"
                        checked={false}
                        disabled={isToggling}
                        onChange={() => toggleTask(task.id, "pending")}
                      />
                      {isToggling && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined animate-spin text-[#8A05BE] text-sm">progress_activity</span>
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors block truncate">
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className={`text-[10px] font-medium ${
                          new Date(task.dueDate) < new Date() ? "text-red-500" : "text-gray-400"
                        }`}>
                          {new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <>
                  {pendingTasks.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <div className="h-px flex-1 bg-gray-200/50" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Concluídas</span>
                      <div className="h-px flex-1 bg-gray-200/50" />
                    </div>
                  )}
                  {completedTasks.map((task) => {
                    const isToggling = togglingIds.has(task.id)
                    return (
                      <label
                        key={task.id}
                        className="flex items-start gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-all group opacity-60"
                      >
                        <div className="relative mt-0.5">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-green-500 focus:ring-green-500 w-4 h-4 cursor-pointer"
                            checked={true}
                            disabled={isToggling}
                            onChange={() => toggleTask(task.id, "completed")}
                          />
                          {isToggling && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="material-symbols-outlined animate-spin text-gray-400 text-sm">progress_activity</span>
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-400 line-through transition-colors block truncate">
                          {task.title}
                        </span>
                      </label>
                    )
                  })}
                </>
              )}

              <Link
                href="/dashboard/tarefas"
                className="block text-center text-xs text-[#8A05BE] hover:underline pt-2"
              >
                Ver todas as tarefas
              </Link>
            </>
          )}
        </div>
        <TaskForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      </div>
    </>
  )
}
