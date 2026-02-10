interface QuickActionsCardProps {
  onRegisterIncome: () => void;
  onRegisterExpense: () => void;
}

export function QuickActionsCard({ 
  onRegisterIncome, 
  onRegisterExpense 
}: QuickActionsCardProps) {
  return (
    <div className="lg:col-span-1 flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-center gap-4">
        <h3 className="text-lg font-bold mb-2">Ações Rápidas</h3>
        
        {/* Register income button */}
        <button
          onClick={onRegisterIncome}
          className="w-full group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 hover:border-[#820AD1]/30 hover:shadow-md transition-all"
        >
          <div className="size-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
            <span 
              className="material-symbols-outlined" 
              style={{ fontSize: '24px' }}
            >
              arrow_downward
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold group-hover:text-[#820AD1] transition-colors">
              Registrar Entrada
            </p>
            <p className="text-xs text-[#7c6189]">Pagamento de paciente</p>
          </div>
        </button>
        
        {/* Register expense button */}
        <button
          onClick={onRegisterExpense}
          className="w-full group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 hover:border-red-400/30 hover:shadow-md transition-all"
        >
          <div className="size-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
            <span 
              className="material-symbols-outlined" 
              style={{ fontSize: '24px' }}
            >
              arrow_upward
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold group-hover:text-red-500 transition-colors">
              Nova Despesa
            </p>
            <p className="text-xs text-[#7c6189]">Contas, aluguel, etc.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
