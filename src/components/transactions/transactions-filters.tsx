interface TransactionsFiltersProps {
  period: string;
  status: string;
  patientSearch: string;
  onPeriodChange: (period: string) => void;
  onStatusChange: (status: string) => void;
  onPatientSearchChange: (search: string) => void;
  onApplyFilters: () => void;
}

export function TransactionsFilters({
  period,
  status,
  patientSearch,
  onPeriodChange,
  onStatusChange,
  onPatientSearchChange,
  onApplyFilters
}: TransactionsFiltersProps) {
  return (
    <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Period filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#7c6189] uppercase tracking-wide">
            Período
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7c6189]">
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '18px' }}
              >
                calendar_today
              </span>
            </span>
            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg text-[#161118] dark:text-white focus:ring-2 focus:ring-[#820AD1]/50 focus:border-[#820AD1] outline-none appearance-none font-medium"
            >
              <option value="nov-2023">Novembro 2023</option>
              <option value="out-2023">Outubro 2023</option>
              <option value="last-30">Últimos 30 dias</option>
              <option value="last-60">Últimos 60 dias</option>
              <option value="last-90">Últimos 90 dias</option>
            </select>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#7c6189] uppercase tracking-wide">
            Status
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7c6189]">
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '18px' }}
              >
                filter_list
              </span>
            </span>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg text-[#161118] dark:text-white focus:ring-2 focus:ring-[#820AD1]/50 focus:border-[#820AD1] outline-none appearance-none font-medium"
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="overdue">Atrasado</option>
            </select>
          </div>
        </div>

        {/* Patient search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#7c6189] uppercase tracking-wide">
            Paciente
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7c6189]">
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '18px' }}
              >
                person_search
              </span>
            </span>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => onPatientSearchChange(e.target.value)}
              placeholder="Nome do paciente"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg text-[#161118] dark:text-white focus:ring-2 focus:ring-[#820AD1]/50 focus:border-[#820AD1] outline-none font-medium placeholder:text-[#7c6189]/70"
            />
          </div>
        </div>

        {/* Apply button */}
        <div className="flex items-end">
          <button
            onClick={onApplyFilters}
            className="w-full h-[42px] bg-[#820AD1] text-white font-bold rounded-lg hover:bg-[#6D08AF] transition-colors shadow-lg shadow-[#820AD1]/20 flex items-center justify-center gap-2"
          >
            <span 
              className="material-symbols-outlined" 
              style={{ fontSize: '20px' }}
            >
              check
            </span>
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
