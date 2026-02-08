export function PatientListHeader() {
  return (
    <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200/40 mb-2">
      <div className="col-span-4">Paciente</div>
      <div className="col-span-3">Especialidade / Foco</div>
      <div className="col-span-3">Sessões</div>
      <div className="col-span-2 text-right">Ações</div>
    </div>
  )
}
