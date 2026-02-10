interface PatientInfoCardProps {
  patientData: {
    name: string
    age: number
    birthdate: string
    education: string
    therapyPlan: string
    guardian: {
      name: string
      relationship: string
      phone: string
    }
    lastSession: {
      date: string
      time: string
      status: string
    }
    photo?: string
  }
}

export function PatientInfoCard({ patientData }: PatientInfoCardProps) {
  return (
    <section className="glass-card-strong rounded-3xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#820AD1]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center relative z-10">
        {/* Foto e Info Básica */}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start w-full xl:w-auto">
          <div className="relative group flex-shrink-0">
            <div 
              className="bg-center bg-no-repeat bg-cover rounded-[1.5rem] size-28 shadow-lg border-4 border-white"
              style={{
                backgroundImage: patientData.photo 
                  ? `url(${patientData.photo})` 
                  : 'linear-gradient(135deg, #820AD1 0%, #C084FC 100%)'
              }}
            >
              {!patientData.photo && (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                  {patientData.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-3 text-center sm:text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="bg-purple-50 p-1.5 rounded-lg text-[#820AD1]">
                  <span className="material-symbols-outlined text-[18px]">cake</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Idade</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {patientData.age} anos ({patientData.birthdate})
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                  <span className="material-symbols-outlined text-[18px]">school</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Escolaridade</span>
                  <span className="text-sm font-semibold text-gray-900">{patientData.education}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                <div className="bg-pink-50 p-1.5 rounded-lg text-pink-600">
                  <span className="material-symbols-outlined text-[18px]">medical_services</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Plano Terapêutico</span>
                  <span className="text-sm font-semibold text-gray-900">{patientData.therapyPlan}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hidden xl:block w-px h-24 bg-gray-200"></div>
        
        {/* Responsável e Última Sessão */}
        <div className="flex flex-col sm:flex-row gap-8 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-full p-2 text-gray-500">
              <span className="material-symbols-outlined">family_restroom</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Responsável</span>
              <p className="text-sm font-bold text-gray-900">
                {patientData.guardian.name} ({patientData.guardian.relationship})
              </p>
              <p className="text-xs text-gray-600 font-medium">{patientData.guardian.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-green-50 rounded-full p-2 text-green-600">
              <span className="material-symbols-outlined">event_available</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Última Sessão</span>
              <p className="text-sm font-bold text-gray-900">{patientData.lastSession.date}, {patientData.lastSession.time}</p>
              <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                {patientData.lastSession.status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
