'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// =============================================
// Validation Schemas
// =============================================
const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  type: z.enum(['task', 'reminder']).default('task'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional(),
  patient_id: z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
});

const updateTaskSchema = taskSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  completed_at: z.string().optional(),
});

// =============================================
// Types
// =============================================
type TaskInput = z.infer<typeof taskSchema>;
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// Actions
// =============================================

/**
 * Create a new task
 */
export async function createTask(
  input: TaskInput
): Promise<ActionResponse> {
  try {
    // Validate input
    const validated = taskSchema.parse(input);

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Create task
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...validated,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return { success: false, error: 'Erro ao criar tarefa' };
    }

    revalidatePath('/dashboard/tarefas');
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in createTask:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Erro ao criar tarefa' };
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  input: UpdateTaskInput
): Promise<ActionResponse> {
  try {
    // Validate input
    const validated = updateTaskSchema.parse(input);
    const { id, ...updates } = validated;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Update task
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return { success: false, error: 'Erro ao atualizar tarefa' };
    }

    if (!data) {
      return { success: false, error: 'Tarefa não encontrada' };
    }

    revalidatePath('/dashboard/tarefas');
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateTask:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Erro ao atualizar tarefa' };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Delete task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: 'Erro ao excluir tarefa' };
    }

    revalidatePath('/dashboard/tarefas');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteTask:', error);
    return { success: false, error: 'Erro ao excluir tarefa' };
  }
}

/**
 * Toggle task status between pending and completed
 */
export async function toggleTaskStatus(
  id: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Get current task
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !task) {
      return { success: false, error: 'Tarefa não encontrada' };
    }

    // Toggle status
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updates: { status: string; completed_at?: string | null } = { status: newStatus };

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    // Update task
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling task status:', error);
      return { success: false, error: 'Erro ao atualizar status' };
    }

    revalidatePath('/dashboard/tarefas');
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in toggleTaskStatus:', error);
    return { success: false, error: 'Erro ao atualizar status' };
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  id: string,
  status: 'pending' | 'completed' | 'cancelled'
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Prepare updates
    const updates: { status: string; completed_at?: string | null } = { status };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'pending') {
      updates.completed_at = null;
    }

    // Update task
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: 'Erro ao atualizar status' };
    }

    if (!data) {
      return { success: false, error: 'Tarefa não encontrada' };
    }

    revalidatePath('/dashboard/tarefas');
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    return { success: false, error: 'Erro ao atualizar status' };
  }
}

/**
 * Bulk delete tasks
 */
export async function bulkDeleteTasks(
  ids: string[]
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Delete tasks
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error bulk deleting tasks:', error);
      return { success: false, error: 'Erro ao excluir tarefas' };
    }

    revalidatePath('/dashboard/tarefas');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Error in bulkDeleteTasks:', error);
    return { success: false, error: 'Erro ao excluir tarefas' };
  }
}
