import { Button } from "@/components/ui/button"

interface PatientHeaderButtonProps {
  icon: string
  label: string
  onClick: () => void
  variant?: "primary" | "outline"
  iconFilled?: boolean
}

export function PatientHeaderButton({
  icon,
  label,
  onClick,
  variant = "outline",
  iconFilled = false
}: PatientHeaderButtonProps) {
  if (variant === "primary") {
    return (
      <Button
        onClick={onClick}
        className="bg-[#820AD1] hover:bg-[#820AD1]/90 text-white text-sm font-bold py-2.5 px-5 rounded-full shadow-lg shadow-[#820AD1]/20 flex items-center gap-2"
      >
        <span className={`material-symbols-outlined text-[18px] ${iconFilled ? 'fill-1' : ''}`}>
          {icon}
        </span>
        {label}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="bg-white border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold py-2.5 px-5 rounded-full shadow-sm flex items-center gap-2"
    >
      <span className={`material-symbols-outlined text-[18px] ${iconFilled ? 'fill-1' : ''}`}>
        {icon}
      </span>
      {label}
    </Button>
  )
}
