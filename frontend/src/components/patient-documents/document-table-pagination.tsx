interface DocumentTablePaginationProps {
  currentCount: number
  totalCount: number
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export function DocumentTablePagination({
  currentCount,
  totalCount,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = true,
}: DocumentTablePaginationProps) {
  return (
    <div className="p-6 border-t border-gray-100/50 bg-white/20 backdrop-blur-sm flex items-center justify-between">
      <span className="text-xs font-medium text-gray-500">
        Mostrando {currentCount} de {totalCount} documentos
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-[#8A05BE] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-[#8A05BE] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
    </div>
  )
}
