import React from 'react';

interface AppointmentSummaryProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  mode: string;
  onCancel: () => void;
  onConfirm: () => void;
  isValid: boolean;
}

export function AppointmentSummary({
  selectedDate,
  selectedTime,
  mode,
  onCancel,
  onConfirm,
  isValid,
}: AppointmentSummaryProps) {
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '—';

  const summaryText = `${formattedDate} • ${selectedTime || '—'} • ${
    mode === 'online' ? 'Online' : 'Presencial'
  }`;

  return (
    <div className="flex items-center justify-between pt-6 mt-2 border-t border-[#f3f0f4] dark:border-white/5">
      <button
        onClick={onCancel}
        className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        Cancelar
      </button>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
            Resumo
          </p>
          <p className="text-sm font-bold text-[#161118] dark:text-white">
            {summaryText}
          </p>
        </div>
        <button
          onClick={onConfirm}
          disabled={!isValid}
          className="px-8 py-3 rounded-xl bg-[#820AD1] text-white font-bold text-sm shadow-lg shadow-[#820AD1]/30 hover:bg-[#6D08AF] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Confirmar Agendamento
          <span className="material-symbols-outlined text-lg">check</span>
        </button>
      </div>
    </div>
  );
}
