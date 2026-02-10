import { calculateStoragePercentage } from "./patient-documents-utils"

interface DocumentsHeaderProps {
  storageUsed: number
  storageTotal: number
}

export function DocumentsHeader({ storageUsed, storageTotal }: DocumentsHeaderProps) {
  const storagePercentage = calculateStoragePercentage(storageUsed, storageTotal)

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Histórico de Documentos
        </h2>
        <p className="text-gray-500 mt-2 text-base font-normal max-w-2xl">
          Biblioteca clínica completa. Gerencie prontuários, exames e arquivos multimídia.
        </p>
      </div>

      {/* Storage Indicator */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4 shadow-sm min-w-[240px] border border-white">
        <div className="size-10 rounded-full bg-[#8A05BE]/10 flex items-center justify-center text-[#8A05BE]">
          <span className="material-symbols-outlined">cloud</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
            <span>{storageUsed} GB</span>
            <span className="text-gray-400">de {storageTotal} GB</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#8A05BE] to-[#C084FC] rounded-full"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
