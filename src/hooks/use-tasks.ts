import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as tasksApi from "@/lib/api/tasks"
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/lib/api/tasks"

export type { Task, CreateTaskInput, UpdateTaskInput }

export function useTasks(options?: {
  type?: string
  status?: string
  priority?: string
  patientId?: string
  page?: number
  limit?: number
}) {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tasks", options],
    queryFn: () => tasksApi.listTasks(options),
  })

  const tasks = data?.data ?? []

  const createTaskMutation = useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...updates }: UpdateTaskInput & { id: string }) =>
      tasksApi.updateTask(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  })

  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) throw new Error("Task not found")
    const newStatus = task.status === "completed" ? "pending" : "completed"
    const result = await tasksApi.updateTask(id, {
      status: newStatus,
      completed: newStatus === "completed",
    })
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
    return result
  }

  const statistics = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter(
      (t) => t.status === "pending" && t.dueDate && new Date(t.dueDate) < new Date()
    ).length,
    dueToday: tasks.filter(
      (t) =>
        t.status === "pending" &&
        t.dueDate &&
        new Date(t.dueDate).toDateString() === new Date().toDateString()
    ).length,
    highPriority: tasks.filter(
      (t) => t.status === "pending" && t.priority === "high"
    ).length,
  }

  return {
    tasks,
    loading: isLoading,
    error,
    statistics,
    total: data?.total ?? 0,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    toggleTaskStatus,
    refetch,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  }
}

export function useTask(taskId: string) {
  const { data: task, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.getTask(taskId),
    enabled: !!taskId,
  })

  return { task, loading: isLoading, error }
}
