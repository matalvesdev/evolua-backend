import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

// =============================================
// Types
// =============================================
export interface Task {
  id: string;
  clinic_id: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'task' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  patient_id?: string;
  appointment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: 'task' | 'reminder';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  patient_id?: string;
  appointment_id?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  status?: 'pending' | 'completed' | 'cancelled';
  completed_at?: string;
}

export interface UseTasksOptions {
  type?: 'task' | 'reminder';
  status?: ('pending' | 'completed' | 'cancelled')[];
  priority?: ('low' | 'medium' | 'high')[];
  patient_id?: string;
  appointment_id?: string;
  limit?: number;
}

// =============================================
// Hook: useTasks
// =============================================
export function useTasks(options?: UseTasksOptions) {
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', options],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      if (options?.priority && options.priority.length > 0) {
        query = query.in('priority', options.priority);
      }

      if (options?.patient_id) {
        query = query.eq('patient_id', options.patient_id);
      }

      if (options?.appointment_id) {
        query = query.eq('appointment_id', options.appointment_id);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: CreateTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          type: task.type || 'task',
          priority: task.priority || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Toggle task status (pending <-> completed)
  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updates: UpdateTaskInput = {
      id,
      status: newStatus,
    };

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = undefined;
    }

    return updateTaskMutation.mutateAsync(updates);
  };

  // Update task status with completion tracking
  const updateTaskStatus = async (
    id: string,
    status: 'pending' | 'completed' | 'cancelled'
  ) => {
    const updates: UpdateTaskInput = { id, status };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'pending') {
      updates.completed_at = undefined;
    }

    return updateTaskMutation.mutateAsync(updates);
  };

  // Get statistics
  const statistics = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter(
      (t) =>
        t.status === 'pending' &&
        t.due_date &&
        new Date(t.due_date) < new Date()
    ).length,
    dueToday: tasks.filter(
      (t) =>
        t.status === 'pending' &&
        t.due_date &&
        new Date(t.due_date).toDateString() === new Date().toDateString()
    ).length,
    highPriority: tasks.filter(
      (t) => t.status === 'pending' && t.priority === 'high'
    ).length,
  };

  return {
    // Data
    tasks,
    loading: isLoading,
    error,
    statistics,

    // Actions
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    toggleTaskStatus,
    updateTaskStatus,
    refetch,

    // Mutation states
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}

// =============================================
// Hook: useTask (single task)
// =============================================
export function useTask(taskId: string) {
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId,
  });

  return { task, loading: isLoading, error };
}
