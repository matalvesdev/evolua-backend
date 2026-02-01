import Link from "next/link"
import { PatientHeaderButton, PatientStatusBadge } from "@/components/patients"

interface ProfileHeaderProps {
  patientName: string
  status: "active" | "inactive" | "discharged"
}

export function ProfileHeader({ patientName, status }: ProfileHeaderProps) {
  const statusLabels = {
    active: "Em Tratamento",
    inactive: "Inativo",
    discharged: "Alta"
  }

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-2 text-sm text-gray-600 font-medium mb-1">
          <Link href="/dashboard/pacientes" className="hover:text-[#820AD1] transition-colors">
            Pacientes
          </Link>
          <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
          <span className="text-gray-900">Perfil</span>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            {patientName}
          </h1>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {statusLabels[status]}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <PatientHeaderButton
          icon="edit"
          label="Editar"
          onClick={() => console.log("Edit clicked")}
          variant="outline"
        />
        <PatientHeaderButton
          icon="chat"
          label="Mensagem"
          onClick={() => console.log("Message clicked")}
          variant="primary"
        />
      </div>
    </div>
  )
}
