import { DocumentTableRow } from "./document-table-row"
import { DocumentTablePagination } from "./document-table-pagination"

interface Document {
  id: string
  fileName: string
  fileDescription: string
  fileType: "pdf" | "audio" | "image" | "document" | "other"
  date: string
  size: string
  author: {
    name: string
    image?: string
    initials?: string
  }
}

interface DocumentsTableProps {
  documents: Document[]
  totalCount: number
  onView?: (documentId: string) => void
  onShare?: (documentId: string) => void
  onDownload?: (documentId: string) => void
  onPlay?: (documentId: string) => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export function DocumentsTable({
  documents,
  totalCount,
  onView,
  onShare,
  onDownload,
  onPlay,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: DocumentsTableProps) {
  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col relative border border-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-5 px-8 text-xs font-bold text-gray-400 uppercase tracking-wider w-[45%]">
                Nome do Arquivo
              </th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Tamanho
              </th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Autor
              </th>
              <th className="py-5 px-8 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60 bg-white/20">
            {documents.map((doc) => (
              <DocumentTableRow
                key={doc.id}
                fileName={doc.fileName}
                fileDescription={doc.fileDescription}
                fileType={doc.fileType}
                date={doc.date}
                size={doc.size}
                author={doc.author}
                onView={() => onView?.(doc.id)}
                onShare={() => onShare?.(doc.id)}
                onDownload={() => onDownload?.(doc.id)}
                onPlay={() => onPlay?.(doc.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <DocumentTablePagination
        currentCount={documents.length}
        totalCount={totalCount}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />
    </div>
  )
}
