import React from 'react';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotGridProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  availableSlots: TimeSlot[];
}

export function TimeSlotGrid({
  selectedDate,
  selectedTime,
  onTimeSelect,
  availableSlots,
}: TimeSlotGridProps) {
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-bold text-[#161118] dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[#820AD1] text-lg">
          schedule
        </span>
        Horários Disponíveis{' '}
        {formattedDate && (
          <span className="text-xs font-normal text-gray-500 ml-1">
            ({formattedDate})
          </span>
        )}
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {availableSlots.map((slot) => {
          const isSelected = selectedTime === slot.time;

          if (!slot.available) {
            return (
              <button
                key={slot.time}
                disabled
                className="py-2 px-1 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-white/5"
              >
                {slot.time}
              </button>
            );
          }

          return (
            <button
              key={slot.time}
              onClick={() => onTimeSelect(slot.time)}
              className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-[#820AD1] text-white font-bold shadow-md shadow-[#820AD1]/20 ring-2 ring-[#820AD1] ring-offset-2 dark:ring-offset-[#1c1022]'
                  : 'border border-gray-200 dark:border-white/10 text-[#161118] dark:text-white hover:border-[#820AD1] hover:text-[#820AD1] bg-white dark:bg-transparent'
              }`}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
