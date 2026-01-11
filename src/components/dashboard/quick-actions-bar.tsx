interface QuickAction {
  icon: string
  label: string
  onClick?: () => void
}

const quickActions: QuickAction[] = [
  { icon: "person_add", label: "Novo Paciente" },
  { icon: "event", label: "Agendar Sessão" },
  { icon: "mic", label: "Gravar Relatório" },
]

export function QuickActionsBar() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
      {quickActions.map((action) => (
        <button
          key={action.label}
          className="flex-1 min-w-40 flex flex-col sm:flex-row items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-2xl shadow-lg shadow-purple-200 transition-all hover:-translate-y-0.5 active:scale-95 group"
          onClick={action.onClick}
        >
          <span className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
            <span className="material-symbols-outlined">{action.icon}</span>
          </span>
          <span className="font-bold text-sm">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
