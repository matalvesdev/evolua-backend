interface TherapeuticObjectiveProps {
  title: string
  description: string
  definedDate: string
}

export function TherapeuticObjective({
  title,
  description,
  definedDate,
}: TherapeuticObjectiveProps) {
  return (
    <section className="glass-card rounded-[2rem] p-8 relative overflow-hidden group border border-white">
      <div className="absolute inset-0 bg-linear-to-r from-[#8A05BE]/5 via-white/40 to-transparent pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#8A05BE]/5 rounded-full blur-3xl group-hover:bg-[#8A05BE]/10 transition-colors duration-700" />
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
        <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-black/5 text-[#8A05BE] shrink-0 group-hover:scale-105 transition-transform duration-300">
          <span className="material-symbols-outlined text-[42px]" style={{ fontVariationSettings: '"FILL" 1' }}>
            flag_circle
          </span>
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-[#8A05BE]/10 text-[#8A05BE] border border-[#8A05BE]/10 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Objetivo Terapêutico
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">event</span>
              Definido em {definedDate}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h2>
          
          <p className="text-gray-600 text-[15px] leading-relaxed max-w-4xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
