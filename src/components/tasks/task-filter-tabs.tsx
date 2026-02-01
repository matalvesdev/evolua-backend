import React from 'react';

type TaskCategory = 'all' | 'clinical' | 'admin';

interface TaskFilterTabsProps {
  activeFilter: TaskCategory;
  onFilterChange: (filter: TaskCategory) => void;
  taskCount: number;
}

export function TaskFilterTabs({
  activeFilter,
  onFilterChange,
  taskCount,
}: TaskFilterTabsProps) {
  const filters: { value: TaskCategory; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'clinical', label: 'Clínicas' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-4 items-center">
        <h2 className="text-xl font-bold text-[#161118] dark:text-white flex items-center gap-2">
          To-Do List
          <span className="bg-[#820AD1]/10 text-[#820AD1] text-xs px-2 py-0.5 rounded-full border border-[#820AD1]/20">
            {taskCount}
          </span>
        </h2>
      </div>
      <div className="flex bg-[#f3f0f4] dark:bg-white/5 rounded-lg p-1">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-4 py-1.5 rounded text-xs transition-all ${
              activeFilter === filter.value
                ? 'font-bold bg-white dark:bg-white/10 text-[#161118] dark:text-white shadow-sm'
                : 'font-medium text-[#7c6189] hover:text-[#820AD1]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
