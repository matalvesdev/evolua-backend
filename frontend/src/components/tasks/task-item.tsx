import React from 'react';

type TaskStatus = 'pending' | 'completed' | 'overdue';
type TaskType = 'clinical' | 'admin' | 'general';

interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  dueDate?: string;
  completed: boolean;
}

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const typeConfig = {
  clinical: {
    label: 'Clínica',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-600',
  },
  admin: {
    label: 'Admin',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-600',
  },
  general: {
    label: 'Geral',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600',
  },
};

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const config = typeConfig[task.type];

  const getStatusText = () => {
    if (task.completed) {
      return (
        <span className="text-[10px] text-[#7c6189] flex items-center gap-1">
          <span className="material-symbols-outlined text-[10px]">check</span>
          Concluído
        </span>
      );
    }

    if (task.status === 'overdue') {
      return (
        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[10px] text-red-500">
            error
          </span>
          Atrasado
        </span>
      );
    }

    if (task.dueDate) {
      return (
        <span className="text-[10px] text-[#7c6189] flex items-center gap-1">
          <span className="material-symbols-outlined text-[10px]">schedule</span>
          {task.dueDate}
        </span>
      );
    }

    return null;
  };

  return (
    <label className="group flex items-center gap-4 p-3 rounded-xl hover:bg-[#f3f0f4] dark:hover:bg-white/5 transition-colors cursor-pointer">
      {/* Checkbox */}
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="peer sr-only"
        />
        <div
          className={`size-5 border-2 rounded flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-[#820AD1] border-[#820AD1]'
              : 'border-[#cbd5e1] dark:border-gray-600'
          }`}
        >
          <svg
            className={`w-3.5 h-3.5 text-white pointer-events-none ${
              task.completed ? 'block' : 'hidden'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>

      {/* Task Content */}
      <div className={`flex-1 ${task.completed ? 'opacity-60' : ''}`}>
        <p
          className={`text-sm font-medium text-[#161118] dark:text-gray-200 group-hover:text-[#820AD1] transition-colors ${
            task.completed ? 'line-through decoration-gray-400' : ''
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-[10px] font-bold ${config.textColor} ${config.bgColor} px-1.5 py-0.5 rounded`}
          >
            {config.label}
          </span>
          {getStatusText()}
        </div>
      </div>

      {/* Delete Button */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(task.id);
          }}
          className="p-1 text-[#7c6189] hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            delete
          </span>
        </button>
      </div>
    </label>
  );
}
