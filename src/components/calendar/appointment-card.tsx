import React from 'react';

type AppointmentStatus = 'completed' | 'scheduled' | 'pending';

interface AppointmentCardProps {
  id: string;
  patientName: string;
  patientAvatar: string;
  startTime: string;
  endTime: string;
  therapyType: string;
  status: AppointmentStatus;
  onStartSession?: () => void;
  onViewDetails?: () => void;
}

const statusConfig = {
  completed: {
    icon: 'check_circle',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    label: 'Concluído',
  },
  scheduled: {
    icon: 'schedule',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    label: 'Agendado',
  },
  pending: {
    icon: 'pending',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    label: 'Pendente',
  },
};

export function AppointmentCard({
  id,
  patientName,
  patientAvatar,
  startTime,
  endTime,
  therapyType,
  status,
  onStartSession,
  onViewDetails,
}: AppointmentCardProps) {
  const config = statusConfig[status];
  const isCompleted = status === 'completed';

  return (
    <div 
      className={`relative rounded-2xl p-4 flex flex-col gap-3 group transition-all cursor-pointer ${
        isCompleted
          ? 'bg-white dark:bg-white/5 shadow-sm border-l-4 border-[#820AD1] dark:border-[#820AD1] hover:shadow-md'
          : 'bg-white/60 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10'
      }`}
    >
      {/* Header: Time and Status */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            {startTime} - {endTime}
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1 group-hover:text-[#820AD1] transition-colors">
            {patientName}
          </h4>
        </div>
        <div className={`${config.bgColor} ${config.textColor} p-1.5 rounded-lg`}>
          <span className="material-symbols-outlined block" style={{ fontSize: '16px' }}>
            {config.icon}
          </span>
        </div>
      </div>

      {/* Patient Info */}
      <div className="flex items-center gap-3 mt-1">
        <div 
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 ring-2 ring-white dark:ring-[#1c1022]"
          style={{ backgroundImage: `url(${patientAvatar})` }}
        />
        <span className="text-xs font-medium text-gray-500">{therapyType}</span>
      </div>

      {/* Actions */}
      {(onStartSession || onViewDetails) && (
        <div className="mt-2 pt-3 border-t border-gray-100 dark:border-white/5 flex gap-2">
          {onStartSession && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onStartSession();
              }}
              className="flex-1 text-xs font-bold py-2 rounded-lg bg-[#820AD1] text-white hover:bg-[#6D08AF] transition-colors shadow-sm shadow-[#820AD1]/20"
            >
              Iniciar Sessão
            </button>
          )}
          {onViewDetails && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="flex-1 text-xs font-bold py-2 rounded-lg bg-white dark:bg-white/10 text-gray-700 dark:text-white border border-gray-200 dark:border-transparent hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
            >
              Detalhes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
