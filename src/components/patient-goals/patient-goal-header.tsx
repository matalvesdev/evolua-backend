interface PatientGoalHeaderProps {
  patientName: string
  patientImage?: string
  status: "active" | "inactive" | "discharged"
  age: number
  birthDate: string
  specialty: string
  schooling: string
  startDate: string
  overallProgress: number
}

const statusConfig = {
  active: { label: "Em Tratamento", color: "green" },
  inactive: { label: "Inativo", color: "gray" },
  discharged: { label: "Alta", color: "blue" },
}

export function PatientGoalHeader({
  patientName,
  patientImage,
  status,
  age,
  birthDate,
  specialty,
  schooling,
  startDate,
  overallProgress,
}: PatientGoalHeaderProps) {
  const statusInfo = statusConfig[status]
  const initial = patientName.charAt(0)

  return (
    <section className="glass-card rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start relative overflow-hidden transition-all hover:shadow-lg border border-white">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#820AD1]/10 via-purple-100/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="flex-1 flex flex-col md:flex-row gap-6 items-center md:items-start z-10 w-full">
        {/* Patient Avatar */}
        <div className="relative group flex-shrink-0">
          {patientImage ? (
            <div
              className="bg-center bg-no-repeat bg-cover rounded-[2rem] size-32 shadow-lg ring-4 ring-white/50"
              style={{ backgroundImage: `url(${patientImage})` }}
            />
          ) : (
            <div className="size-32 rounded-[2rem] bg-gradient-to-br from-[#820AD1] to-purple-400 shadow-lg ring-4 ring-white/50 flex items-center justify-center text-white text-5xl font-bold">
              {initial}
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 bg-white text-[#820AD1] p-2 rounded-xl shadow-lg hover:scale-110 hover:shadow-[#820AD1]/20 transition-all border border-gray-100">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
        </div>

        {/* Patient Info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap justify-center md:justify-start">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{patientName}</h1>
            <span className={`px-3 py-1 bg-${statusInfo.color}-100/50 text-${statusInfo.color}-700 border border-${statusInfo.color}-200/50 text-xs font-bold rounded-full backdrop-blur-sm`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-gray-600 text-sm mb-6 justify-center md:justify-start">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-lg border border-white/50">
              <span className="material-symbols-outlined text-[#820AD1] text-[18px]">cake</span>
              {age} anos ({birthDate})
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-lg border border-white/50">
              <span className="material-symbols-outlined text-[#820AD1] text-[18px]">medical_services</span>
              {specialty}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-lg border border-white/50">
              <span className="material-symbols-outlined text-[#820AD1] text-[18px]">school</span>
              {schooling}
            </span>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none bg-[#820AD1] hover:bg-[#6D08AF] text-white text-sm font-bold py-2.5 px-6 rounded-full transition-all shadow-lg shadow-[#820AD1]/25 hover:shadow-[#820AD1]/40 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir Plano
            </button>
            <button className="flex-1 md:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold py-2.5 px-6 rounded-full transition-all shadow-sm">
              Editar Detalhes
            </button>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="hidden lg:flex gap-10 border-l border-[#820AD1]/10 pl-10 z-10 min-w-[280px]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Início</span>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#820AD1] text-[20px]">calendar_today</span>
            <span className="text-lg font-bold text-gray-900">{startDate}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Progresso Geral</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#820AD1] to-purple-400 rounded-full relative"
                style={{ width: `${overallProgress}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
