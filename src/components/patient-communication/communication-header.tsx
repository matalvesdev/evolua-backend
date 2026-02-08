interface CommunicationHeaderProps {
  patientName: string
  patientImage?: string
  guardianName: string
  guardianRelationship: string
  age: number
  status: "active" | "inactive" | "discharged"
  onCall?: () => void
  onWhatsApp?: () => void
  onEmail?: () => void
}

const statusConfig = {
  active: { label: "ATIVO", color: "green" },
  inactive: { label: "INATIVO", color: "gray" },
  discharged: { label: "ALTA", color: "blue" },
}

export function CommunicationHeader({
  patientName,
  patientImage,
  guardianName,
  guardianRelationship,
  age,
  status,
  onCall,
  onWhatsApp,
  onEmail,
}: CommunicationHeaderProps) {
  const statusInfo = statusConfig[status]
  const initial = patientName.charAt(0)

  return (
    <section className="glass-card rounded-3xl p-6 relative overflow-hidden border border-white">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-linear-to-l from-white/40 to-transparent pointer-events-none" />
      
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
        <div className="flex items-center gap-5">
          <div className="relative">
            {patientImage ? (
              <div
                className="bg-center bg-no-repeat bg-cover rounded-2xl size-20 shadow-md border-2 border-white"
                style={{ backgroundImage: `url(${patientImage})` }}
              />
            ) : (
              <div className="size-20 rounded-2xl bg-linear-to-br from-[#8A05BE] to-[#C084FC] shadow-md border-2 border-white flex items-center justify-center text-white text-3xl font-bold">
                {initial}
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 bg-${statusInfo.color}-100 text-${statusInfo.color}-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-${statusInfo.color}-200 shadow-sm`}>
              {statusInfo.label}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{patientName}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">face_3</span>
                Resp: {guardianName} ({guardianRelationship})
              </span>
              <span className="size-1 rounded-full bg-gray-300" />
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">cake</span>
                {age} anos
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCall}
            className="flex flex-col items-center justify-center size-12 rounded-xl bg-white border border-gray-200 text-[#8A05BE] hover:bg-[#8A05BE] hover:text-white hover:border-[#8A05BE] transition-all shadow-sm group"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            <span className="text-[9px] font-bold mt-0.5">Ligar</span>
          </button>

          <button
            onClick={onWhatsApp}
            className="flex flex-col items-center justify-center size-12 rounded-xl bg-white border border-gray-200 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-sm group"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            <span className="text-[9px] font-bold mt-0.5">Whats</span>
          </button>

          <button
            onClick={onEmail}
            className="flex flex-col items-center justify-center size-12 rounded-xl bg-white border border-gray-200 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shadow-sm group"
          >
            <span className="material-symbols-outlined text-[20px]">mail</span>
            <span className="text-[9px] font-bold mt-0.5">Email</span>
          </button>
        </div>
      </div>
    </section>
  )
}
