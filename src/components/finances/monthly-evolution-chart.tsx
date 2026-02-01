interface MonthData {
  month: string;
  value: number;
  heightPercent: number;
  fillPercent: number;
}

interface MonthlyEvolutionChartProps {
  data: MonthData[];
}

export function MonthlyEvolutionChart({ data }: MonthlyEvolutionChartProps) {
  return (
    <div className="lg:col-span-2 glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold">Evolução Mensal</h3>
        <button className="text-[#7c6189] hover:text-[#820AD1] transition-colors">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>
      
      {/* Chart */}
      <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
        {data.map((item, index) => {
          const isCurrentMonth = index === data.length - 1;
          
          return (
            <div 
              key={item.month} 
              className="flex flex-col items-center gap-2 group w-full"
            >
              <div 
                className={`w-full max-w-[40px] ${
                  isCurrentMonth 
                    ? 'bg-[#820AD1]/5 dark:bg-white/5' 
                    : 'bg-[#820AD1]/10 dark:bg-white/5'
                } rounded-t-lg relative overflow-hidden group-hover:bg-[#820AD1]/20 transition-all`}
                style={{ height: `${item.heightPercent}%` }}
              >
                {/* Tooltip */}
                {isCurrentMonth && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#161118] text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                      notation: 'compact'
                    }).format(item.value)}
                  </div>
                )}
                
                {/* Bar fill */}
                <div 
                  className={`absolute bottom-0 left-0 w-full rounded-t-lg ${
                    isCurrentMonth
                      ? 'bg-gradient-to-t from-[#820AD1] to-[#c084fc] shadow-[0_0_15px_rgba(130,10,209,0.4)]'
                      : 'bg-gradient-to-t from-[#820AD1]/40 to-[#820AD1]/80'
                  }`}
                  style={{ height: `${item.fillPercent}%` }}
                ></div>
              </div>
              
              <span 
                className={`text-xs ${
                  isCurrentMonth 
                    ? 'font-bold text-[#820AD1]' 
                    : 'font-medium text-[#7c6189]'
                }`}
              >
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
