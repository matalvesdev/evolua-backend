interface PatientStatusBadgeProps {
  status: "active" | "inactive" | "discharged"
}

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  const statusConfig = {
    active: {
      label: "Ativo",
      className: "bg-green-100 text-green-700 border-green-200"
    },
    inactive: {
      label: "Inativo",
      className: "bg-gray-100 text-gray-700 border-gray-200"
    },
    discharged: {
      label: "Alta",
      className: "bg-blue-100 text-blue-700 border-blue-200"
    }
  }

  const config = statusConfig[status]

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.className}`}>
      {config.label}
    </span>
  )
}
