"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Task {
  id: number
  title: string
  description: string
  priority: "low" | "medium" | "high"
  dueDate: string
  completed: boolean
  category: "appointment" | "report" | "admin" | "other"
}

export default function TarefasPage() {
  const [filter, setFilter] = React.useState<"all" | "pending" | "completed">("all")
  const [newTask, setNewTask] = React.useState("")
  const [tasks, setTasks] = React.useState<Task[]>([
    {
      id: 1,
      title: "Finalizar relatório de Maria Silva",
      description: "Completar avaliação mensal",
      priority: "high",
      dueDate: "2026-01-12",
      completed: false,
      category: "report",
    },
    {
      id: 2,
      title: "Confirmar agendamento com João Santos",
      description: "Ligar para confirmar sessão da próxima semana",
      priority: "medium",
      dueDate: "2026-01-13",
      completed: false,
      category: "appointment",
    },
    {
      id: 3,
      title: "Atualizar prontuário",
      description: "Adicionar notas da última sessão",
      priority: "low",
      dueDate: "2026-01-11",
      completed: true,
      category: "admin",
    },
  ])

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed
    if (filter === "completed") return task.completed
    return true
  })

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    )
  }

  const addTask = () => {
    if (!newTask.trim()) return

    const task: Task = {
      id: Date.now(),
      title: newTask,
      description: "",
      priority: "medium",
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
      category: "other",
    }

    setTasks((prev) => [task, ...prev])
    setNewTask("")
  }

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const pendingCount = tasks.filter((t) => !t.completed).length
  const completedCount = tasks.filter((t) => t.completed).length

  const priorityColors = {
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const categoryIcons = {
    appointment: "event",
    report: "description",
    admin: "settings",
    other: "task",
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tarefas</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Organize suas atividades e acompanhamentos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">
              list_alt
            </span>
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {tasks.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">
              pending_actions
            </span>
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Pendentes</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                {pendingCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
              check_circle
            </span>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Concluídas</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {completedCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Task */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Adicionar nova tarefa..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="flex-1"
          />
          <Button onClick={addTask} className="bg-purple-600 hover:bg-purple-700">
            <span className="material-symbols-outlined text-base">add</span>
          </Button>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === "all"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Todas ({tasks.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === "pending"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Pendentes ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === "completed"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Concluídas ({completedCount})
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 && (
          <Card className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 mb-2 block">
              task_alt
            </span>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === "pending"
                ? "Nenhuma tarefa pendente"
                : filter === "completed"
                  ? "Nenhuma tarefa concluída"
                  : "Nenhuma tarefa cadastrada"}
            </p>
          </Card>
        )}

        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className={`p-4 transition-all ${
              task.completed ? "opacity-60 bg-gray-50 dark:bg-gray-800/50" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-1 flex-shrink-0"
                aria-label="Toggle task completion"
              >
                <span
                  className={`material-symbols-outlined text-2xl transition-colors ${
                    task.completed
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 dark:text-gray-600 hover:text-purple-600 dark:hover:text-purple-400"
                  }`}
                >
                  {task.completed ? "check_circle" : "radio_button_unchecked"}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className={`font-medium text-gray-900 dark:text-white ${
                      task.completed ? "line-through" : ""
                    }`}
                  >
                    {task.title}
                  </h3>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label="Delete task"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-full font-medium ${priorityColors[task.priority]}`}>
                    {task.priority === "high" && "Alta"}
                    {task.priority === "medium" && "Média"}
                    {task.priority === "low" && "Baixa"}
                  </span>

                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-sm">
                      {categoryIcons[task.category]}
                    </span>
                    {task.category === "appointment" && "Agendamento"}
                    {task.category === "report" && "Relatório"}
                    {task.category === "admin" && "Administrativo"}
                    {task.category === "other" && "Outro"}
                  </span>

                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-sm">event</span>
                    {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
