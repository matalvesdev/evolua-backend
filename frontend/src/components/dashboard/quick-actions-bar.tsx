"use client"

import * as React from "react"
import { Portal } from "@/components/ui/portal"
import { NewPatientModal } from "./modals/new-patient-modal"
import { NewAppointmentModal } from "./modals/new-appointment-modal"
import { NewReportModal } from "./modals/new-report-modal"

export type ModalType = "patient" | "appointment" | "report" | null

interface QuickAction {
  icon: string
  label: string
  modalType: ModalType
}

const quickActions: QuickAction[] = [
  { icon: "person_add", label: "Novo Paciente", modalType: "patient" },
  { icon: "event", label: "Agendar Sessão", modalType: "appointment" },
  { icon: "mic", label: "Gravar Relatório", modalType: "report" },
]

interface QuickActionsBarProps {
  externalModal?: ModalType
  onCloseExternal?: () => void
}

export function QuickActionsBar({ externalModal, onCloseExternal }: QuickActionsBarProps) {
  const [internalModal, setInternalModal] = React.useState<ModalType>(null)

  const openModal = externalModal || internalModal

  const handleClose = () => {
    setInternalModal(null)
    onCloseExternal?.()
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="flex items-center justify-center gap-2 bg-[#8A05BE] hover:bg-[#6D08AF] text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-[rgba(138,5,190,0.25)] transition-all hover:-translate-y-0.5 active:scale-95 group min-h-[48px]"
            onClick={() => setInternalModal(action.modalType)}
          >
            <span className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <span className="material-symbols-outlined">{action.icon}</span>
            </span>
            <span className="font-bold text-sm">{action.label}</span>
          </button>
        ))}
      </div>

      <Portal>
        <NewPatientModal open={openModal === "patient"} onClose={handleClose} />
        <NewAppointmentModal open={openModal === "appointment"} onClose={handleClose} />
        <NewReportModal open={openModal === "report"} onClose={handleClose} />
      </Portal>
    </>
  )
}
