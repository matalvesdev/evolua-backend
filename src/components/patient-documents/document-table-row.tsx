import { fileTypeConfig, isAudioFile as checkIsAudio } from "./patient-documents-utils"

interface DocumentTableRowProps {
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
  onView?: () => void
  onShare?: () => void
  onDownload?: () => void
  onPlay?: () => void
}

export function DocumentTableRow({
  fileName,
  fileDescription,
  fileType,
  date,
  size,
  author,
  onView,
  onShare,
  onDownload,
  onPlay,
}: DocumentTableRowProps) {
  const config = fileTypeConfig[fileType]
  const isAudio = checkIsAudio(fileType)

  return (
    <tr className="group hover:bg-white/60 transition-colors">
      {/* File Info */}
      <td className="py-4 px-8">
        <div className="flex items-center gap-4">
          <div
            className={`size-12 rounded-2xl ${config.bgColor} border ${config.borderColor} flex items-center justify-center ${config.textColor} shadow-sm group-hover:scale-110 transition-transform duration-300`}
          >
            <span className="material-symbols-outlined">{config.icon}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 group-hover:text-[#8A05BE] transition-colors">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{fileDescription}</p>
          </div>
        </div>
      </td>

      {/* Date */}
      <td className="py-4 px-6 text-sm text-gray-600 font-medium">{date}</td>

      {/* Size */}
      <td className="py-4 px-6 text-sm text-gray-500">{size}</td>

      {/* Author */}
      <td className="py-4 px-6">
        <div className="flex items-center gap-2" title={author.name}>
          {author.image ? (
            <div
              className="size-7 rounded-full bg-cover bg-center shadow-sm ring-1 ring-white"
              style={{ backgroundImage: `url(${author.image})` }}
            />
          ) : (
            <div className="size-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 ring-1 ring-white">
              {author.initials}
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-8 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isAudio ? (
            <button
              onClick={onPlay}
              className="size-8 rounded-full hover:bg-white hover:text-[#8A05BE] flex items-center justify-center text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100"
              title="Reproduzir"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            </button>
          ) : (
            <button
              onClick={onView}
              className="size-8 rounded-full hover:bg-white hover:text-[#8A05BE] flex items-center justify-center text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100"
              title="Visualizar"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          )}
          <button
            onClick={onShare}
            className="size-8 rounded-full hover:bg-white hover:text-blue-500 flex items-center justify-center text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100"
            title="Compartilhar"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
          <button
            onClick={onDownload}
            className="size-8 rounded-full hover:bg-white hover:text-green-500 flex items-center justify-center text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100"
            title="Baixar"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>
      </td>
    </tr>
  )
}
