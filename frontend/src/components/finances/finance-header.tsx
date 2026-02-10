interface FinanceHeaderProps {
  view: 'monthly' | 'annual';
  onViewChange: (view: 'monthly' | 'annual') => void;
}

export function FinanceHeader({ view, onViewChange }: FinanceHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">
          Seu Financeiro 💰
        </h1>
        <p className="text-[#7c6189] dark:text-gray-400 text-base">
          Acompanhe seus ganhos e despesas em tempo real.
        </p>
      </div>
      
      <div className="flex gap-2">
        <div className="flex bg-white dark:bg-white/5 rounded-lg p-1 shadow-sm border border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onViewChange('monthly')}
            className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${
              view === 'monthly'
                ? 'bg-[#f3f0f4] dark:bg-[#820AD1]/20 text-[#161118] dark:text-white shadow-sm'
                : 'text-[#7c6189] hover:bg-gray-50 dark:hover:bg-white/5 font-medium'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => onViewChange('annual')}
            className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${
              view === 'annual'
                ? 'bg-[#f3f0f4] dark:bg-[#820AD1]/20 text-[#161118] dark:text-white shadow-sm'
                : 'text-[#7c6189] hover:bg-gray-50 dark:hover:bg-white/5 font-medium'
            }`}
          >
            Anual
          </button>
        </div>
      </div>
    </div>
  );
}
