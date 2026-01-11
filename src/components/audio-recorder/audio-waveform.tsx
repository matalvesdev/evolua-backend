"use client"

interface AudioWaveformProps {
  isRecording: boolean
  barCount?: number
}

export function AudioWaveform({ isRecording, barCount = 15 }: AudioWaveformProps) {
  return (
    <div className="flex items-center justify-center h-16 md:h-24 w-full gap-1 md:gap-2 px-4 md:px-12">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 md:w-2 bg-gradient-to-t from-[#820AD1]/30 to-[#820AD1] rounded-full transition-all ${
            isRecording ? "wave-bar" : "h-1/4 opacity-30"
          }`}
          style={{
            height: isRecording ? undefined : "25%",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes sound-wave {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .wave-bar {
          animation: sound-wave 1.2s ease-in-out infinite;
        }
        .wave-bar:nth-child(odd) { animation-duration: 0.8s; }
        .wave-bar:nth-child(2n) { animation-duration: 1.1s; }
        .wave-bar:nth-child(3n) { animation-duration: 1.3s; }
        .wave-bar:nth-child(4n) { animation-duration: 0.9s; }
        .wave-bar:nth-child(5n) { animation-duration: 1.5s; }
      `}</style>
    </div>
  )
}
