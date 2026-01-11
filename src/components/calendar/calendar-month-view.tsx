import React from 'react';
import { CalendarDayCell } from './calendar-day-cell';

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointmentCount: number;
  date: Date;
}

interface CalendarMonthViewProps {
  month: string;
  year: number;
  days: CalendarDay[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onTodayClick: () => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarMonthView({
  month,
  year,
  days,
  onPreviousMonth,
  onNextMonth,
  onTodayClick,
  onDayClick,
}: CalendarMonthViewProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 h-full flex flex-col">
      {/* Header with Month/Year and Navigation */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {month} {year}
          </h2>
          <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-full p-1 border border-gray-200 dark:border-white/10">
            <button 
              onClick={onPreviousMonth}
              className="p-1.5 rounded-full hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 block" style={{ fontSize: '20px' }}>
                chevron_left
              </span>
            </button>
            <button 
              onClick={onNextMonth}
              className="p-1.5 rounded-full hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 block" style={{ fontSize: '20px' }}>
                chevron_right
              </span>
            </button>
          </div>
        </div>
        <button 
          onClick={onTodayClick}
          className="px-4 py-2 text-sm font-bold text-[#820AD1] bg-[#820AD1]/10 hover:bg-[#820AD1]/15 rounded-lg transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-4">
          {WEEKDAYS.map((day) => (
            <div 
              key={day}
              className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 grid-rows-5 h-full gap-2 lg:gap-4 flex-1">
          {days.map((dayData, index) => (
            <CalendarDayCell
              key={index}
              day={dayData.day}
              isCurrentMonth={dayData.isCurrentMonth}
              isToday={dayData.isToday}
              appointmentCount={dayData.appointmentCount}
              onClick={() => onDayClick(dayData.date)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
