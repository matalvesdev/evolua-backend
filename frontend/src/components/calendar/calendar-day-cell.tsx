import React from 'react';

interface CalendarDayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointmentCount: number;
  onClick: () => void;
}

export function CalendarDayCell({ 
  day, 
  isCurrentMonth, 
  isToday, 
  appointmentCount,
  onClick 
}: CalendarDayCellProps) {
  if (!isCurrentMonth) {
    return (
      <div className="p-2 flex justify-center pt-2 text-gray-300 dark:text-gray-700 text-sm font-medium">
        {day}
      </div>
    );
  }

  if (isToday) {
    return (
      <div 
        onClick={onClick}
        className="group h-24 lg:h-auto bg-white dark:bg-white/10 border border-[#820AD1]/20 shadow-lg shadow-[#820AD1]/10 rounded-2xl p-2 transition-all cursor-pointer flex flex-col items-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#820AD1]" />
        <span className="size-7 flex items-center justify-center rounded-full bg-[#820AD1] text-white text-sm font-bold mb-1 shadow-sm">
          {day}
        </span>
        {appointmentCount > 0 && (
          <div className="flex flex-col gap-1 w-full px-1">
            <div className="h-1.5 w-full bg-[#820AD1]/20 rounded-full" />
            {appointmentCount > 1 && (
              <div className="h-1.5 w-2/3 bg-purple-300/50 rounded-full mx-auto" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="group h-24 lg:h-auto border border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:bg-white/50 dark:hover:bg-white/5 rounded-2xl p-2 transition-all cursor-pointer flex flex-col items-center"
    >
      <span className="size-7 flex items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {day}
      </span>
      {appointmentCount === 1 && (
        <div className="size-1.5 rounded-full bg-[#820AD1]/70 mb-1" />
      )}
      {appointmentCount > 1 && (
        <div className="flex gap-1">
          <div className="size-1.5 rounded-full bg-[#820AD1]" />
          <div className="size-1.5 rounded-full bg-purple-400" />
        </div>
      )}
    </div>
  );
}
