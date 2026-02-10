interface CommunicationEvent {
  id: string
  type: "reminder" | "note" | "email"
  title: string
  message: string
  date: string
  time: string
  badge?: {
    label: string
    color: string
  }
}

export function CommunicationHistory() {
  const events: CommunicationEvent[] = [
    {
      id: "1",
      type: "reminder",
      title: "Lembrete WhatsApp Enviado",
      message: '"Olá Mariana, lembrete da sessão de Ana Clara amanhã às 14h. Confirma?"',
      date: "Ontem",
      time: "09:30",
      badge: {
        label: "Automático",
        color: "bg-green-50 text-green-700 border-green-100"
      }
    },
    {
      id: "2",
      type: "note",
      title: "Anotação Interna",
      message: "Mãe relatou que Ana Clara está pronunciando melhor os fonemas /r/ e /l/. Próxima sessão focar em exercícios de repetição lúdica.",
      date: "10 Out",
      time: "15:45"
    },
    {
      id: "3",
      type: "email",
      title: "Relatório Enviado",
      message: "Relatório trimestral enviado para escola@escolaexemplo.com.br.",
      date: "05 Out",
      time: "18:20"
    }
  ]

  const typeConfig = {
    reminder: { icon: "check_circle", color: "bg-green-500" },
    note: { icon: "edit_note", color: "bg-[#820AD1]" },
    email: { icon: "mail", color: "bg-blue-400" }
  }

  return (
    <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2.5 rounded-xl text-green-600 shadow-sm shadow-green-100">
            <span className="material-symbols-outlined">forum</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Histórico de Comunicação</h3>
            <p className="text-xs text-gray-600 font-medium">Última interação há 2 dias</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </div>

      {/* Timeline */}
      <div className="relative pl-4 space-y-8 before:content-[''] before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
        {events.map((event) => {
          const config = typeConfig[event.type]
          return (
            <div key={event.id} className="relative flex gap-5 pl-4 group">
              <div className={`absolute left-0 top-1.5 size-3.5 ${config.color} rounded-full border-[3px] border-white shadow-sm z-10 box-content`}></div>
              <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group-hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${event.type === 'reminder' ? 'text-green-600' : event.type === 'note' ? 'text-[#820AD1]' : 'text-blue-500'}`}>
                      {config.icon}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{event.title}</span>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{event.date}, {event.time}</span>
                </div>
                <p className={`text-sm text-gray-600 leading-relaxed ${event.type === 'reminder' ? 'bg-gray-50 p-3 rounded-lg italic' : ''}`}>
                  {event.message}
                </p>
                {event.badge && (
                  <div className="mt-3 flex gap-2">
                    <span className={`px-2 py-0.5 ${event.badge.color} text-[10px] font-bold uppercase rounded-md tracking-wide border`}>
                      {event.badge.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
