interface Patient {
  initials: string
  name: string
  specialty: string
  sessionLabel: string
  sessionTime: string
  bgColor: string
  textColor: string
  isOnline?: boolean
}

// TODO: Fetch from Supabase
const patients: Patient[] = [];

export function RecentPatients() {
  return (
    <div className="glass-panel p-6 lg:p-8 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl text-primary">
            <span className="material-symbols-outlined">group</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Pacientes Recentes</h2>
        </div>
        <button className="text-sm font-bold text-primary hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
          Ver todos <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
      <div className="space-y-2">
        {patients.map((patient) => (
          <div
            key={patient.initials}
            className="flex items-center justify-between p-3 hover:bg-white/60 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-white/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full ${patient.bgColor} flex items-center justify-center ${patient.textColor} font-bold text-lg border-2 border-white shadow-sm`}>
                  {patient.initials}
                </div>
                {patient.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{patient.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{patient.specialty}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{patient.sessionLabel}</p>
              <p className="text-sm font-medium text-gray-800">{patient.sessionTime}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-colors" title="Chat">
                <span className="material-symbols-outlined">chat</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-colors" title="Prontuário">
                <span className="material-symbols-outlined">description</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
