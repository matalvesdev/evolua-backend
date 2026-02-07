"use client"

import { useState } from "react"
import { useTasks } from "@/hooks"
import { TaskForm } from "@/components/tasks"
import Link from "next/link"

export function DashboardTodoList() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { tasks, loading, toggleTaskStatus } = useTasks({ 
    type: 'task',
    status: 'pending',
    limit: 5,
  })

  const toggleTask = async (taskId: string) => {
    await toggleTaskStatus(taskId)
  }

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
            className="text-xs font-bold text-primary hover:bg-purple-50 px-2 py-1 rounded-md transition-colors"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2 mb-6">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">Nenhuma tarefa pendente</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-xs text-primary hover:underline"
              >
                Criar primeira tarefa
              </button>
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-start gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-colors group"
                >
                  <input
                    type="checkbox"
                    className={`mt-1 rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 ${task.status === 'completed' ? "opacity-50" : ""}`}
                    checked={task.status === 'completed'}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span className={`text-sm transition-colors ${task.status === 'completed' ? "text-gray-400 line-through" : "text-gray-600 group-hover:text-gray-900"}`}>
                    {task.title}
                  </span>
                </label>
              ))}
              <Link 
                href="/dashboard/tarefas"
                className="block text-center text-xs text-primary hover:underline pt-2"
              >
                Ver todas as tarefas
              </Link>
            </>
          )}
        </div>
        <TaskForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      </div>
    </>
  );
}
