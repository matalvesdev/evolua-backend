interface SmartAction {
  id: string
  title: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
}

export function SmartActionsCard() {
  const actions: SmartAction[] = [
    {
      id: "1",
      title: "Enviar Lembrete",
      description: "Confirmar sessão do dia 15",
      icon: "chat",
      iconBg: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      id: "2",
      title: "Desejar Parabéns",
      description: "Aniversário da mãe amanhã",
      icon: "celebration",
      iconBg: "bg-purple-50",
      iconColor: "text-[#820AD1]"
    },
    {
      id: "3",
      title: "Solicitar Feedback",
      description: "Questionário pós-avaliação",
      icon: "assignment_turned_in",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500"
    }
  ]

  return (
    <div className="glass-card rounded-[2rem] p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="material-symbols-outlined text-[#820AD1] text-[22px]">auto_awesome</span>
        <h3 className="text-base font-bold text-gray-900">Smart Actions</h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-[#820AD1]/30 hover:shadow-md transition-all text-left group"
          >
            <div className={`${action.iconBg} ${action.iconColor} p-2.5 rounded-lg group-hover:bg-opacity-100 transition-colors`}>
              <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
            </div>
            <div className="flex-1">
              <span className="block text-sm font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors">
                {action.title}
              </span>
              <span className="block text-xs text-gray-600 font-medium">{action.description}</span>
            </div>
            <span className="material-symbols-outlined text-gray-300 group-hover:text-[#820AD1] group-hover:translate-x-1 transition-all">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
