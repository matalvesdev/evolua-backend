export function StatusCard() {
  return (
    <div className="rounded-[2rem] bg-gradient-to-br from-[#f8f5fa] to-white p-6 flex flex-col items-center text-center justify-center min-h-[180px] relative overflow-hidden border border-gray-200 shadow-sm">
      <div 
        className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: 'radial-gradient(#820AD1 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      ></div>
      
      <div className="bg-white p-3 rounded-2xl shadow-sm mb-3 z-10 ring-1 ring-gray-100">
        <span className="material-symbols-outlined text-[#820AD1] text-[28px]">folder_managed</span>
      </div>
      
      <h3 className="text-sm font-bold text-gray-900 z-10">Documentação em Dia!</h3>
      <p className="text-xs text-gray-600 mt-1 max-w-[200px] z-10 font-medium">
        Todos os relatórios deste mês foram arquivados com sucesso.
      </p>
    </div>
  )
}
