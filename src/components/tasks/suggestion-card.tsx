import React from 'react';

type SuggestionType = 'ai' | 'productivity' | 'documents';

interface SuggestionCardProps {
  type: SuggestionType;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

const typeConfig = {
  ai: {
    icon: 'auto_awesome',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    badge: 'Sugestão IA',
    actionColor: 'text-[#820AD1]',
    bgIcon: 'text-[#820AD1]',
  },
  productivity: {
    icon: 'trending_up',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    badge: 'Produtividade',
    actionColor: 'text-green-600 dark:text-green-400',
    bgIcon: 'text-green-500',
  },
  documents: {
    icon: 'history_edu',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badge: 'Prontuários',
    actionColor: 'text-orange-600 dark:text-orange-400',
    bgIcon: 'text-orange-500',
  },
};

const bgIcons = {
  ai: 'auto_awesome',
  productivity: 'finance',
  documents: 'folder_managed',
};

export function SuggestionCard({
  type,
  title,
  description,
  actionLabel,
  onAction,
}: SuggestionCardProps) {
  const config = typeConfig[type];

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:shadow-lg hover:shadow-[#820AD1]/5 transition-all duration-300">
      {/* Background Icon */}
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <span
          className={`material-symbols-outlined ${config.bgIcon}`}
          style={{ fontSize: '64px' }}
        >
          {bgIcons[type]}
        </span>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${config.iconBg} ${config.iconColor}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {config.icon}
          </span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#7c6189]">
          {config.badge}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-base font-bold text-[#161118] dark:text-white leading-tight">
        {title}
      </h3>
      <p className="text-xs text-[#7c6189] leading-relaxed">{description}</p>

      {/* Action Button */}
      <button
        onClick={onAction}
        className={`mt-auto text-xs font-bold ${config.actionColor} flex items-center gap-1 hover:underline`}
      >
        {actionLabel}{' '}
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          arrow_forward
        </span>
      </button>
    </div>
  );
}
