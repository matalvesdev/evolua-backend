export function WelcomeSection() {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            Olá, Dra. Camila! <span className="text-2xl">👋</span>
          </h1>
          <p className="text-lg text-gray-600">
            Sua agenda de hoje espera por você <span className="text-primary font-bold">💜</span>
          </p>
        </div>
        <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-default bg-white/80">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-purple-200 border border-white flex items-center justify-center text-[10px] text-purple-700 font-bold">4</div>
            <div className="w-6 h-6 rounded-full bg-blue-200 border border-white flex items-center justify-center text-[10px] text-blue-700 font-bold">2</div>
          </div>
          <span className="text-sm font-medium text-gray-600">
            <strong>4 sessões</strong> e <strong>2 relatórios</strong> pendentes.
          </span>
        </div>
      </div>
    </div>
  )
}
