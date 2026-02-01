import { CommunicationTimelineItem } from "./communication-timeline-item"

interface Communication {
  id: string
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

interface TimelineGroup {
  date: string
  label: string
  isToday?: boolean
  communications: Communication[]
}

interface CommunicationTimelineProps {
  groups: TimelineGroup[]
  onLoadMore?: () => void
}

export function CommunicationTimeline({
  groups,
  onLoadMore,
}: CommunicationTimelineProps) {
  return (
    <div className="relative z-10 flex-1">
      <div className="absolute left-[23px] top-4 bottom-0 w-[2px] bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />

      {groups.map((group, groupIndex) => (
        <div key={group.date} className={groupIndex !== groups.length - 1 ? "mb-8" : "mb-4"}>
          <div className="flex items-center gap-4 mb-6 relative">
            <div className={`size-3 rounded-full ${group.isToday ? 'bg-[#820AD1]' : 'bg-gray-300'} ring-4 ring-white shadow-sm ml-[18px] z-10`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md border ${
              group.isToday
                ? "text-[#820AD1] bg-[#820AD1]/5 border-[#820AD1]/10"
                : "text-gray-600 bg-gray-50 border-gray-200"
            }`}>
              {group.label}
            </span>
          </div>

          <div className="flex flex-col gap-5 pl-2">
            {group.communications.map((comm) => (
              <CommunicationTimelineItem
                key={comm.id}
                type={comm.type}
                sender={comm.sender}
                status={comm.status}
                time={comm.time}
                message={comm.message}
                author={comm.author}
                readTime={comm.readTime}
                attachment={comm.attachment}
                isSystemMessage={comm.isSystemMessage}
                isReceived={comm.isReceived}
              />
            ))}
          </div>
        </div>
      ))}

      {onLoadMore && (
        <div className="flex justify-center mt-6 pb-2">
          <button
            onClick={onLoadMore}
            className="text-xs font-bold text-gray-600 hover:text-[#820AD1] transition-colors flex items-center gap-2 uppercase tracking-wider py-2 px-4 rounded-full hover:bg-gray-100"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            Carregar comunicações antigas
          </button>
        </div>
      )}
    </div>
  )
}
