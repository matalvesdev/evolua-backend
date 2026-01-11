import React from 'react';

interface DatePickerCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function DatePickerCalendar({
  selectedDate,
  onDateSelect,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
}: DatePickerCalendarProps) {
  const monthName = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  // Generate calendar days
  const generateDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(-(prevMonthLastDay - i));
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const days = generateDays();
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const isSelectedDate = (day: number) => {
    if (!selectedDate || day < 0) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    if (day < 0) return;
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onDateSelect(newDate);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-bold text-[#161118] dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[#820AD1] text-lg">
          calendar_today
        </span>
        Data
      </label>
      <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-4 shadow-sm">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-[#161118] dark:text-white capitalize">
            {monthName}
          </span>
          <div className="flex gap-1">
            <button
              onClick={onPreviousMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              onClick={onNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 text-center text-xs gap-y-2">
          {/* Week day headers */}
          {weekDays.map((day, index) => (
            <span key={index} className="text-gray-400 font-medium">
              {day}
            </span>
          ))}

          {/* Days */}
          {days.map((day, index) => {
            if (day === null || day < 0) {
              return (
                <span key={index} className="p-2 text-gray-300">
                  {day !== null ? Math.abs(day) : ''}
                </span>
              );
            }

            const selected = isSelectedDate(day);

            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                className={`p-2 rounded-lg text-[#161118] dark:text-white transition-all ${
                  selected
                    ? 'bg-[#820AD1] text-white shadow-md shadow-[#820AD1]/30 font-bold'
                    : 'hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
