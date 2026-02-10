import React from 'react';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarHeaderProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onFilterClick: () => void;
}

export function CalendarHeader({ currentView, onViewChange, onFilterClick }: CalendarHeaderProps) {
  const viewButtons: { value: CalendarView; label: string }[] = [
    { value: 'month', label: 'Mês' },
    { value: 'week', label: 'Semana' },
    { value: 'day', label: 'Dia' },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 className="text-[#161118] dark:text-white text-3xl font-bold tracking-tight mb-2">
          Sua Agenda 🗓️
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-normal">
          Gerencie seus horários com facilidade.
        </p>
      </div>

      <div className="flex gap-3">
        {/* View Toggle */}
        <div className="flex bg-white dark:bg-white/5 rounded-xl p-1.5 shadow-sm border border-gray-200/50 dark:border-white/10">
          {viewButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => onViewChange(btn.value)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                currentView === btn.value
                  ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 font-medium'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Filters Button */}
        <button 
          onClick={onFilterClick}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl shadow-sm text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            filter_list
          </span>
          Filtros
        </button>
      </div>
    </div>
  );
}
