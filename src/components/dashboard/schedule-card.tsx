interface ScheduleCardProps {
  time: string
  duration: string
  patientName: string
  sessionType: string
  sessionTypeColor: string
  badge: string
  badgeColor: string
  location: string
  locationIcon: string
  locationColor: string
  isPrimary?: boolean
}

export function ScheduleCard({
  time,
  duration,
  patientName,
  sessionType,
  sessionTypeColor,
  badge,
  badgeColor,
  location,
  locationIcon,
  locationColor,
  isPrimary = false,
}: ScheduleCardProps) {
  return (
    <div
      className={`glass-card-item p-4 rounded-2xl flex flex-col justify-between transition-all ${
        isPrimary
          ? "border-l-4 border-l-[#8A05BE] shadow-lg shadow-[rgba(138,5,190,0.1)] hover:-translate-y-1 transition-transform duration-300"
          : "border border-white/60 hover:border-[rgba(138,5,190,0.2)]"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <div className={`flex flex-col items-center justify-center min-w-14 ${isPrimary ? "bg-[#8A05BE]/5" : "bg-gray-50"} rounded-xl py-2`}>
            <span className={`text-base font-bold ${isPrimary ? "text-[#8A05BE]" : "text-gray-600"}`}>{time}</span>
            <span className="text-[10px] font-bold text-gray-400">{duration}</span>
          </div>
          <div>
            <h4 className={`font-bold text-lg ${isPrimary ? "text-gray-900" : "text-gray-800"}`}>{patientName}</h4>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${sessionTypeColor}`}></span>
              {sessionType}
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg ${badgeColor} text-[10px] font-bold flex items-center gap-1`}>
          {isPrimary && <span className="material-symbols-outlined text-[12px]">timer</span>}
          {badge}
        </span>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
          <span className={`material-symbols-outlined text-[14px] ${locationColor}`}>{locationIcon}</span> {location}
        </span>
        {isPrimary ? (
          <button className="px-5 py-2 bg-[#8A05BE] text-white font-bold text-sm rounded-xl shadow-lg shadow-[rgba(138,5,190,0.25)] hover:bg-[#6D08AF] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Iniciar Sessão
          </button>
        ) : (
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-[#8A05BE]/5 hover:text-[#8A05BE] hover:border-[#8A05BE]/20 transition-all">
            Ver Detalhes
          </button>
        )}
      </div>
    </div>
  )
}
