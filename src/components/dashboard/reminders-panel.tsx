export function RemindersPanel() {
  return (
    <div className="mb-6">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
        <div className="p-1.5 bg-yellow-100 rounded-lg">
          <span className="material-symbols-outlined text-yellow-600 text-sm">notifications_active</span>
        </div>
        Lembretes
      </h3>

      {/* AI Suggestion */}
      <div className="mb-4 p-4 rounded-2xl bg-linear-to-br from-[#820AD1] to-[#4B0082] text-white shadow-lg shadow-purple-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <span className="material-symbols-outlined text-5xl">auto_awesome</span>
        </div>
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <span className="material-symbols-outlined text-yellow-300 text-sm">lightbulb</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-200">Sugestão</span>
        </div>
        <p className="text-xs font-medium leading-relaxed opacity-95 relative z-10 mb-3">
          Notamos 2 espaços livres amanhã. Adiantar sessão do <strong>Pedro</strong>?
        </p>
        <div className="flex gap-2 relative z-10">
          <button className="text-[10px] font-bold bg-white text-primary px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 flex-1">
            Sim
          </button>
          <button className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
            Agora não
          </button>
        </div>
      </div>

      {/* Reminder items */}
      <div className="space-y-3">
        <div className="bg-white/60 p-3 rounded-2xl border border-white hover:border-purple-200 transition-all hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 min-w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-xs">priority_high</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold text-gray-800 leading-tight">Relatório Pendente</p>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">João Silva (Motricidade)</p>
              <button className="w-full py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-primary hover:border-primary hover:bg-purple-50 transition-colors">
                Preencher Agora
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white/60 p-3 rounded-2xl border border-white hover:border-purple-200 transition-all hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 min-w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined text-xs">send</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800 leading-tight">Enviar Exercícios</p>
              <p className="text-[11px] text-gray-500 mb-2">Para: Ana Clara</p>
              <button className="py-1.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-primary hover:border-primary hover:bg-purple-50 transition-colors">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
