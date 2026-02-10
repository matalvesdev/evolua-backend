import { Button } from "@/components/ui/button"

interface PatientActionButtonsProps {
  onCancel: () => void
  onSave: () => void
  saveLabel?: string
  cancelLabel?: string
  isLoading?: boolean
}

export function PatientActionButtons({
  onCancel,
  onSave,
  saveLabel = "Salvar Alterações",
  cancelLabel = "Cancelar",
  isLoading = false
}: PatientActionButtonsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-8 border-t border-gray-100 mt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
        className="w-full sm:w-auto px-8 py-3.5 rounded-full border-[#820AD1] text-[#820AD1] font-bold hover:bg-[#820AD1]/5 transition-all focus:ring-4 focus:ring-[#820AD1]/10"
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        onClick={onSave}
        disabled={isLoading}
        className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#820AD1] text-white font-bold hover:bg-[#6D08AF] shadow-lg shadow-[#820AD1]/25 hover:shadow-xl hover:shadow-[#820AD1]/30 transition-all focus:ring-4 focus:ring-[#820AD1]/20 flex items-center justify-center gap-2 transform active:scale-95"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            Salvando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">check</span>
            {saveLabel}
          </>
        )}
      </Button>
    </div>
  )
}
