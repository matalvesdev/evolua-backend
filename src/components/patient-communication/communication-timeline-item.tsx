interface CommunicationTimelineItemProps {
  type: "whatsapp" | "sms" | "email" | "received"
  sender: string
  status: "sent" | "delivered" | "read" | "confirmed" | "system" | "received"
  time: string
  message: string
  author?: string
  readTime?: string
  attachment?: {
    name: string
    icon: string
  }
  isSystemMessage?: boolean
  isReceived?: boolean
}

const typeConfig = {
  whatsapp: {
    icon: "forum",
    bgColor: "bg-green-500",
    shadowColor: "shadow-green-200",
    textColor: "text-white",
  },
  sms: {
    icon: "sms",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  email: {
    icon: "mail",
    bgColor: "bg-purple-50",
    textColor: "text-[#8A05BE]",
  },
  received: {
    icon: "forum",
    bgColor: "bg-white",
    textColor: "text-green-600",
    borderColor: "border-green-100",
  },
}

const statusConfig = {
  sent: { label: "Enviada", color: "green" },
  delivered: { label: "Entregue", color: "blue" },
  read: { label: "Lida", color: "blue" },
  confirmed: { label: "Confirmado", color: "green" },
  system: { label: "Sistema", color: "gray" },
  received: { label: "Recebida", color: "green" },
}

export function CommunicationTimelineItem({
  type,
  sender,
  status,
  time,
  message,
  author,
  readTime,
  attachment,
  isSystemMessage = false,
  isReceived = false,
}: CommunicationTimelineItemProps) {
  const config = typeConfig[type]
  const statusInfo = statusConfig[status]

  return (
    <div className="flex gap-4 group opacity-90 hover:opacity-100 transition-opacity">
      <div className="relative z-10 mt-1">
        {type === "whatsapp" && !isReceived ? (
          <div className={`size-10 rounded-full ${config.bgColor} text-white flex items-center justify-center ${'shadowColor' in config ? config.shadowColor : ''} shadow-lg border-[3px] border-white transition-transform group-hover:scale-110`}>
            <span className="material-symbols-outlined text-[18px]">{config.icon}</span>
          </div>
        ) : (
          <div className={`size-10 rounded-full ${config.bgColor} ${config.textColor || ""} ${'borderColor' in config && config.borderColor ? `border ${config.borderColor}` : ""} flex items-center justify-center shadow-sm border-[3px] border-white transition-transform group-hover:scale-110`}>
            <span className="material-symbols-outlined text-[18px]">{config.icon}</span>
          </div>
        )}
      </div>

      <div className={`flex-1 border p-5 rounded-2xl rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all ${
        isReceived
          ? "bg-linear-to-br from-green-50 to-white border-green-100"
          : "bg-white border-gray-100"
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{sender}</span>
            <span className={`px-2 py-0.5 bg-${statusInfo.color}-50 text-${statusInfo.color}-700 text-[10px] font-bold uppercase rounded-md tracking-wide border border-${statusInfo.color}-${isReceived ? '200' : '100'}`}>
              {statusInfo.label}
            </span>
          </div>
          <span className={`text-xs text-gray-600 font-medium px-2 py-1 rounded-md ${isReceived ? 'bg-white/50' : 'bg-gray-50'}`}>
            {time}
          </span>
        </div>

        {isSystemMessage ? (
          <p className="text-gray-600 text-sm italic bg-gray-50 p-3 rounded-lg border border-gray-100">
            &ldquo;{message}&rdquo;
          </p>
        ) : (
          <p className={`text-sm leading-relaxed mb-3 ${isReceived ? 'text-gray-900 font-medium' : 'text-gray-900'}`}>
            {message}
          </p>
        )}

        {attachment && (
          <div className="flex gap-2 mt-3">
            <button className="flex items-center gap-2 text-xs font-bold text-gray-900 hover:text-[#8A05BE] transition-colors bg-gray-50 hover:bg-white border border-gray-100 px-3 py-2 rounded-lg">
              <span className={`material-symbols-outlined text-[18px] ${attachment.icon === 'picture_as_pdf' ? 'text-red-500' : 'text-gray-600'}`}>
                {attachment.icon}
              </span>
              {attachment.name}
            </button>
          </div>
        )}

        {status === "confirmed" && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Confirmado pela mãe
            </div>
          </div>
        )}

        {author && !isReceived && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
              {author}
            </span>
            {readTime && (
              <div className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                Lido às {readTime}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
