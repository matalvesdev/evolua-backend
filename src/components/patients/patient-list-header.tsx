export function PatientListHeader() {
  return (
    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200/50 mb-2">
      <div className="col-span-4">Paciente</div>
      <div className="col-span-3">Especialidade / Foco</div>
      <div className="col-span-3">Sessões</div>
      <div className="col-span-2 text-right">Ações</div>
    </div>
  )
}
