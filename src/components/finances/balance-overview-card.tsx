interface BalanceOverviewCardProps {
  balance: number;
  monthlyIncome: number;
  pendingAmount: number;
}

export function BalanceOverviewCard({ 
  balance, 
  monthlyIncome, 
  pendingAmount 
}: BalanceOverviewCardProps) {
  return (
    <div className="lg:col-span-2 glass-card rounded-2xl p-8 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#820AD1]/10 rounded-full blur-2xl group-hover:bg-[#820AD1]/15 transition-all"></div>
      
      <div className="relative z-10 flex flex-col justify-between h-full gap-6">
        {/* Main balance */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7c6189] dark:text-gray-400 mb-1">
              Saldo em conta
            </p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(balance)}
            </h2>
          </div>
          <div className="p-2 bg-white/50 dark:bg-white/10 rounded-lg">
            <span 
              className="material-symbols-outlined text-[#820AD1]" 
              style={{ fontSize: '28px' }}
            >
              account_balance_wallet
            </span>
          </div>
        </div>
        
        {/* Income and pending stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
          {/* Monthly income */}
          <div className="bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '20px' }}
              >
                trending_up
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-[#7c6189] dark:text-gray-400">
                Entradas do mês
              </p>
              <p className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(monthlyIncome)}
              </p>
            </div>
          </div>
          
          {/* Pending amount */}
          <div className="bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '20px' }}
              >
                pending_actions
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-[#7c6189] dark:text-gray-400">
                Pendentes
              </p>
              <p className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(pendingAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
