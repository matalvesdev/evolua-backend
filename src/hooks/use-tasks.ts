"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type Task = Database["public"]["Tables"]["tasks"]["Row"]
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"]
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"]
type Reminder = Database["public"]["Tables"]["patient_reminders"]["Row"]
type ReminderInsert = Database["public"]["Tables"]["patient_reminders"]["Insert"]
type ReminderUpdate = Database["public"]["Tables"]["patient_reminders"]["Update"]

export interface TaskCounts {
  all: number
  clinical: number
  admin: number
  general: number
}

export interface TasksParams {
  type?: "all" | "clinical" | "admin" | "general"
  status?: "all" | "pending" | "completed" | "overdue" | "cancelled"
  includeCompleted?: boolean
}

export function useTasks(params: TasksParams = {}) {
  const { type = "all", status = "all", includeCompleted = false } = params

  const [tasks, setTasks] = React.useState<Task[]>([])
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [taskCounts, setTaskCounts] = React.useState<TaskCounts>({
    all: 0,
    clinical: 0,
    admin: 0,
    general: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch tasks
      let tasksQuery = supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })

      if (!includeCompleted) {
        tasksQuery = tasksQuery.neq("status", "completed")
      }

      if (type !== "all") {
        tasksQuery = tasksQuery.eq("type", type)
      }

      if (status !== "all") {
        tasksQuery = tasksQuery.eq("status", status)
      }

      const { data: tasksData, error: tasksError } = await tasksQuery

      if (tasksError) throw tasksError

      const allTasks = tasksData || []
      setTasks(allTasks)

      // Calculate task counts (fetch all tasks for counting)
      const { data: allTasksForCount } = await supabase
        .from("tasks")
        .select("type")
        .neq("status", "completed")

      const counts: TaskCounts = {
        all: allTasksForCount?.length || 0,
        clinical: allTasksForCount?.filter((t) => t.type === "clinical").length || 0,
        admin: allTasksForCount?.filter((t) => t.type === "admin").length || 0,
        general: allTasksForCount?.filter((t) => t.type === "general").length || 0,
      }
      setTaskCounts(counts)

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from("patient_reminders")
        .select("*")
        .eq("completed", false)
        .order("due_date", { ascending: true, nullsFirst: false })

      if (remindersError) throw remindersError
      setReminders(remindersData || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefas")
    } finally {
      setLoading(false)
    }
  }, [supabase, type, status, includeCompleted])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Task CRUD operations
  const createTask = React.useCallback(
    async (task: Omit<TaskInsert, "clinic_id" | "therapist_id">) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error("Usuário não autenticado")

        const { data: userProfile } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("id", userData.user.id)
          .single()

        if (!userProfile) throw new Error("Perfil não encontrado")

        const { data, error } = await supabase
          .from("tasks")
          .insert({
            ...task,
            clinic_id: userProfile.clinic_id,
            therapist_id: userData.user.id,
          })
          .select()
          .single()

        if (error) throw error
        await fetchData()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar tarefa")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const updateTask = React.useCallback(
    async (id: string, updates: TaskUpdate) => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", id)
          .select()
          .single()

        if (error) throw error
        await fetchData()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar tarefa")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const deleteTask = React.useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from("tasks").delete().eq("id", id)
        if (error) throw error
        await fetchData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao deletar tarefa")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const completeTask = React.useCallback(
    async (id: string) => {
      return updateTask(id, {
        status: "completed",
        completed: true,
        completed_at: new Date().toISOString(),
      })
    },
    [updateTask]
  )

  const reopenTask = React.useCallback(
    async (id: string) => {
      return updateTask(id, {
        status: "pending",
        completed: false,
        completed_at: null,
      })
    },
    [updateTask]
  )

  // Reminder CRUD operations
  const createReminder = React.useCallback(
    async (reminder: Omit<ReminderInsert, "clinic_id" | "therapist_id">) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error("Usuário não autenticado")

        const { data: userProfile } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("id", userData.user.id)
          .single()

        if (!userProfile) throw new Error("Perfil não encontrado")

        const { data, error } = await supabase
          .from("patient_reminders")
          .insert({
            ...reminder,
            clinic_id: userProfile.clinic_id,
            therapist_id: userData.user.id,
          })
          .select()
          .single()

        if (error) throw error
        await fetchData()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar lembrete")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const updateReminder = React.useCallback(
    async (id: string, updates: ReminderUpdate) => {
      try {
        const { data, error } = await supabase
          .from("patient_reminders")
          .update(updates)
          .eq("id", id)
          .select()
          .single()

        if (error) throw error
        await fetchData()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar lembrete")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const deleteReminder = React.useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("patient_reminders")
          .delete()
          .eq("id", id)

        if (error) throw error
        await fetchData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao deletar lembrete")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const completeReminder = React.useCallback(
    async (id: string) => {
      return updateReminder(id, {
        completed: true,
        completed_at: new Date().toISOString(),
      })
    },
    [updateReminder]
  )

  return {
    tasks,
    reminders,
    taskCounts,
    loading,
    error,
    // Task operations
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
    // Reminder operations
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    // Refresh
    refreshData: fetchData,
  }
}

// Re-export types for convenience
export type { Task, TaskInsert, TaskUpdate, Reminder, ReminderInsert, ReminderUpdate }
