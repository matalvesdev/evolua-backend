'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock,
  Edit,
  MoreVertical,
  Trash,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useTasks, type Task } from '@/hooks/use-tasks';
import { TaskForm } from './task-form';
import { toast } from 'sonner';

// =============================================
// Props
// =============================================
interface TaskListProps {
  tasks?: Task[];
  showFilters?: boolean;
  compact?: boolean;
}

// =============================================
// Component: TaskList
// =============================================
export function TaskList({
  tasks: externalTasks,
  showFilters = true,
  compact = false,
}: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>();
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    tasks: internalTasks,
    loading,
    toggleTaskStatus,
    deleteTask,
    isDeleting,
  } = useTasks();

  const tasks = externalTasks || internalTasks;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter)
      return false;
    if (typeFilter !== 'all' && task.type !== typeFilter) return false;
    return true;
  });

  // Handle task completion toggle
  const handleToggleComplete = async (taskId: string) => {
    try {
      await toggleTaskStatus(taskId);
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  // Handle task deletion
  const handleDelete = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete);
      toast.success('Tarefa excluída com sucesso!');
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  // Handle edit
  const handleEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsFormOpen(true);
  };

  // Get priority badge
  const getPriorityBadge = (priority: Task['priority']) => {
    const variants: Record<string, string> = {
      low: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
      high: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    };

    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
    };

    return (
      <Badge className={variants[priority]} variant="secondary">
        {labels[priority]}
      </Badge>
    );
  };

  // Get type badge
  const getTypeBadge = (type: Task['type']) => {
    return (
      <Badge variant="outline">
        {type === 'task' ? 'Tarefa' : 'Lembrete'}
      </Badge>
    );
  };

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    return (
      task.status === 'pending' &&
      task.due_date &&
      new Date(task.due_date) < new Date()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">
          Carregando tarefas...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="task">Tarefas</SelectItem>
              <SelectItem value="reminder">Lembretes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-sm text-muted-foreground">
            {tasks.length === 0
              ? 'Crie sua primeira tarefa para começar!'
              : 'Ajuste os filtros para ver outras tarefas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50',
                task.status === 'completed' && 'opacity-60',
                isOverdue(task) && 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
              )}
            >
              {/* Checkbox */}
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={() => handleToggleComplete(task.id)}
                className="mt-1"
              />

              {/* Content */}
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={cn(
                      'font-medium',
                      task.status === 'completed' && 'line-through'
                    )}
                  >
                    {task.title}
                  </h4>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(task)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setTaskToDelete(task.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                {task.description && !compact && (
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {getPriorityBadge(task.priority)}
                  {getTypeBadge(task.type)}

                  {task.due_date && (
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        isOverdue(task)
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {isOverdue(task) ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {format(new Date(task.due_date), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Form */}
      <TaskForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setTaskToEdit(undefined);
        }}
        task={taskToEdit}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente
              excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
