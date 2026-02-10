"use client"

import { useEffect, useState } from "react"

interface RecordingTimerProps {
  isRecording: boolean
  isPaused?: boolean
  onTimeUpdate?: (seconds: number) => void
}

export function RecordingTimer({
  isRecording,
  isPaused = false,
  onTimeUpdate,
}: RecordingTimerProps) {
  const [seconds, setSeconds] = useState(0)

  // Reset timer when recording stops
  useEffect(() => {
    if (!isRecording) {
      return () => {
        setSeconds(0)
      }
    }
  }, [isRecording])

  useEffect(() => {
    if (!isRecording || isPaused) return

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  // Notify parent of time changes separately to avoid setState-during-render
  useEffect(() => {
    onTimeUpdate?.(seconds)
  }, [seconds, onTimeUpdate])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-gray-500 text-xs font-semibold tracking-[0.2em] uppercase">
        Tempo Decorrido
      </span>
      <div className="text-6xl md:text-7xl font-bold text-gray-900 tabular-nums tracking-tighter">
        {formatTime(seconds)}
      </div>
    </div>
  )
}
