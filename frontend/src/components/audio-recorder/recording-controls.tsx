"use client"

interface RecordingControlsProps {
  isRecording: boolean
  isPaused?: boolean
  onRecord?: () => void
  onPause?: () => void
  onResume?: () => void
  onRestart?: () => void
  onCancel?: () => void
}

export function RecordingControls({
  isRecording,
  isPaused = false,
  onRecord,
  onPause,
  onResume,
  onRestart,
  onCancel,
}: RecordingControlsProps) {
  const handleMainButton = () => {
    if (!isRecording) {
      onRecord?.()
    } else if (isPaused) {
      onResume?.()
    } else {
      onPause?.()
    }
  }

  return (
    <div className="flex items-center gap-8 md:gap-12 mb-8 w-full justify-center">
      {/* Restart Button */}
      <button
        onClick={onRestart}
        disabled={!isRecording}
        className="group flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#8A05BE] group-hover:border-[#8A05BE]/30 group-hover:bg-[#8A05BE]/5 transition-all group-disabled:hover:text-gray-400 group-disabled:hover:border-gray-200 group-disabled:hover:bg-transparent">
          <span className="material-symbols-outlined">restart_alt</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-[#8A05BE]/80 group-disabled:hover:text-gray-400">
          Reiniciar
        </span>
      </button>

      {/* Main Record/Pause Button */}
      <button
        onClick={handleMainButton}
        className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#8A05BE] shadow-[0_4px_20px_rgba(138,5,190,0.3)] flex items-center justify-center hover:shadow-[0_4px_30px_rgba(138,5,190,0.5)] transition-all hover:scale-105 active:scale-95 z-10 pulse-animation"
      >
        <span className="material-symbols-outlined text-white text-4xl md:text-5xl">
          {!isRecording ? "mic" : isPaused ? "play_arrow" : "pause"}
        </span>
      </button>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="group flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95"
      >
        <div className="w-12 h-12 rounded-full border border-red-200 flex items-center justify-center text-red-400 group-hover:text-red-500 group-hover:border-red-300 group-hover:bg-red-50 transition-all">
          <span className="material-symbols-outlined">close</span>
        </div>
        <span className="text-xs text-red-400/70 group-hover:text-red-500">Cancelar</span>
      </button>

      <style jsx>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(138, 5, 190, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(138, 5, 190, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(138, 5, 190, 0); }
        }
        .pulse-animation {
          animation: pulse-ring 2s infinite cubic-bezier(0.66, 0, 0, 1);
        }
      `}</style>
    </div>
  )
}
