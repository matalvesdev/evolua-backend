import React from 'react';

interface TasksHeaderProps {
  totalTasks: number;
  pendingTasks: number;
}

export function TasksHeader({ totalTasks, pendingTasks }: TasksHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-[#161118] dark:text-white text-3xl lg:text-4xl font-bold tracking-tight mb-2">
          Suas Tarefas
        </h1>
        <p className="text-[#7c6189] dark:text-gray-400 text-base font-normal">
          Organize seu dia e aumente sua produtividade.
        </p>
      </div>
      <div className="text-sm text-[#7c6189] font-medium bg-white/50 dark:bg-white/5 px-4 py-2 rounded-lg border border-white/40 dark:border-white/10 backdrop-blur-sm">
        <span className="text-[#820AD1] font-bold">{pendingTasks}</span> tarefas
        pendentes para hoje
      </div>
    </div>
  );
}
