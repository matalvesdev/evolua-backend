import { Button } from "@/components/ui/button"

interface NextSessionCardProps {
  date: string
  day: string
  time: string
}

export function NextSessionCard({ date, day, time }: NextSessionCardProps) {
  return (
    <div className="glass-card rounded-[2rem] p-6 relative overflow-hidden group border-l-4 border-l-[#820AD1]/60">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#820AD1]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">Próxima Sessão</h3>
        <span className="bg-[#820AD1]/10 text-[#820AD1] p-2 rounded-full">
          <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
        </span>
      </div>
      
      <div className="flex flex-col gap-1 mb-6 relative z-10">
        <span className="text-4xl font-bold text-gray-900 tracking-tight">{date}</span>
        <span className="text-base font-medium text-gray-600 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#820AD1]"></span>
          {day} • {time}
        </span>
      </div>
      
      <Button className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-gray-200 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group-hover:scale-[1.02] transform duration-200">
        Iniciar Sessão
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Button>
    </div>
  )
}
