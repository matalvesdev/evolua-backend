interface PatientSectionHeaderProps {
  icon: string
  title: string
}

export function PatientSectionHeader({ icon, title }: PatientSectionHeaderProps) {
  return (
    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
      <span className="flex items-center justify-center size-8 rounded-lg bg-[#820AD1]/10 text-[#820AD1]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      {title}
    </h3>
  )
}
