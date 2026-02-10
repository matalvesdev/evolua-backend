import React from 'react';

type AppointmentMode = 'online' | 'presencial';
type AppointmentDuration = '30m' | '50m' | '1h';

interface AppointmentOptionsProps {
  mode: AppointmentMode;
  duration: AppointmentDuration;
  onModeChange: (mode: AppointmentMode) => void;
  onDurationChange: (duration: AppointmentDuration) => void;
}

export function AppointmentOptions({
  mode,
  duration,
  onModeChange,
  onDurationChange,
}: AppointmentOptionsProps) {
  const modes: { value: AppointmentMode; label: string }[] = [
    { value: 'online', label: 'Online' },
    { value: 'presencial', label: 'Presencial' },
  ];

  const durations: AppointmentDuration[] = ['30m', '50m', '1h'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
      {/* Modalidade */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-bold text-[#161118] dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[#820AD1] text-lg">
            videocam
          </span>
          Modalidade
        </label>
        <div className="flex p-1 bg-[#f3f0f4] dark:bg-white/5 rounded-lg">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => onModeChange(m.value)}
              className={`flex-1 py-1.5 px-3 rounded text-sm transition-all ${
                mode === m.value
                  ? 'font-bold text-[#820AD1] bg-white dark:bg-[#2d1b36] shadow-sm'
                  : 'font-medium text-gray-500 dark:text-gray-400 hover:text-[#161118] dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duração */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-bold text-[#161118] dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[#820AD1] text-lg">
            timelapse
          </span>
          Duração
        </label>
        <div className="flex gap-2">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => onDurationChange(d)}
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                duration === d
                  ? 'border-[#820AD1] bg-[#820AD1]/5 text-[#820AD1] font-bold ring-1 ring-[#820AD1] dark:bg-[#820AD1]/20'
                  : 'border border-gray-200 dark:border-white/10 font-medium text-gray-500 hover:border-[#820AD1] hover:text-[#820AD1] bg-white dark:bg-transparent'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
