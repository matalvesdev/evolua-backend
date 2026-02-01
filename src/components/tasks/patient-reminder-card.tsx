import React from 'react';

type ReminderType = 'birthday' | 'contract' | 'followup';

interface PatientReminder {
  id: string;
  patientName: string;
  patientAvatar: string;
  type: ReminderType;
  message: string;
  actionLabel: string;
}

interface PatientReminderCardProps {
  reminder: PatientReminder;
  onAction: (reminderId: string) => void;
}

const typeConfig = {
  birthday: {
    icon: 'cake',
    bgColor: 'bg-pink-50 dark:bg-pink-900/10',
    borderColor: 'border-pink-100 dark:border-pink-900/20',
    iconColor: 'text-pink-500',
    buttonBg: 'bg-white dark:bg-white/10 dark:text-white',
    buttonHover: 'hover:bg-pink-50',
    buttonText: 'text-pink-600',
  },
  contract: {
    icon: 'description',
    bgColor: 'bg-amber-50 dark:bg-amber-900/10',
    borderColor: 'border-amber-100 dark:border-amber-900/20',
    iconColor: 'text-amber-500',
    buttonBg: 'bg-white dark:bg-white/10 dark:text-white',
    buttonHover: 'hover:bg-amber-50',
    buttonText: 'text-amber-600',
  },
  followup: {
    icon: 'event_repeat',
    bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    borderColor: 'border-blue-100 dark:border-blue-900/20',
    iconColor: 'text-blue-500',
    buttonBg: 'bg-white dark:bg-white/10 dark:text-white',
    buttonHover: 'hover:bg-blue-50',
    buttonText: 'text-blue-600',
  },
};

export function PatientReminderCard({ reminder, onAction }: PatientReminderCardProps) {
  const config = typeConfig[reminder.type];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}
    >
      <div
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0"
        style={{ backgroundImage: `url(${reminder.patientAvatar})` }}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#161118] dark:text-gray-200">
            {reminder.patientName}
          </p>
          <span className={`material-symbols-outlined ${config.iconColor}`} style={{ fontSize: '18px' }}>
            {config.icon}
          </span>
        </div>
        <p className="text-xs text-[#7c6189] mt-0.5">{reminder.message}</p>
        <button
          onClick={() => onAction(reminder.id)}
          className={`mt-2 text-[10px] font-bold ${config.buttonText} ${config.buttonBg} px-2 py-1 rounded shadow-sm ${config.buttonHover} transition-colors`}
        >
          {reminder.actionLabel}
        </button>
      </div>
    </div>
  );
}
