"use client"

import { useState } from "react"
import { RecordingTimer } from "./recording-timer"
import { AudioWaveform } from "./audio-waveform"
import { RecordingControls } from "./recording-controls"

interface AudioRecorderPanelProps {
  patientName: string
  onBack?: () => void
  onSave?: (audioBlob: Blob, duration: number) => void
  onCancel?: () => void
}

export function AudioRecorderPanel({
  patientName,
  onBack,
  onSave,
  onCancel,
}: AudioRecorderPanelProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const handleRecord = () => {
    setIsRecording(true)
    setIsPaused(false)
    // Implementar lógica de início de gravação
    console.log("Iniciando gravação...")
  }

  const handlePause = () => {
    setIsPaused(true)
    console.log("Pausando gravação...")
  }

  const handleResume = () => {
    setIsPaused(false)
    console.log("Retomando gravação...")
  }

  const handleRestart = () => {
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    console.log("Reiniciando gravação...")
  }

  const handleCancel = () => {
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    onCancel?.()
    console.log("Cancelando gravação...")
  }

  return (
    <div className="glass-card w-full max-w-xl rounded-3xl p-6 md:p-10 flex flex-col h-full md:h-auto md:min-h-[600px] relative z-20 transition-all duration-300 border border-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 md:mb-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#820AD1] transition-colors group"
        >
          <span className="material-symbols-outlined text-2xl group-hover:-translate-x-1 transition-transform">
            arrow_back
          </span>
          <span className="text-sm font-medium tracking-wide uppercase hidden sm:block">
            Voltar
          </span>
        </button>
        <div className="text-right">
          <h3 className="text-gray-900 text-lg md:text-xl font-bold tracking-tight">
            Novo Relatório por Áudio
          </h3>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-gray-600 text-xs md:text-sm font-medium">
              Paciente: <span className="text-[#820AD1] font-bold">{patientName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 md:gap-12 min-h-[200px]">
        <RecordingTimer
          isRecording={isRecording}
          isPaused={isPaused}
          onTimeUpdate={setRecordingTime}
        />
        <AudioWaveform isRecording={isRecording && !isPaused} />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-full mt-auto pt-8">
        <RecordingControls
          isRecording={isRecording}
          isPaused={isPaused}
          onRecord={handleRecord}
          onPause={handlePause}
          onResume={handleResume}
          onRestart={handleRestart}
          onCancel={handleCancel}
        />

        {/* AI Hint */}
        <div className="bg-white/60 border border-[#820AD1]/10 rounded-full px-5 py-3 md:px-6 md:py-3 flex items-start md:items-center gap-3 max-w-sm shadow-sm backdrop-blur-md">
          <span className="material-symbols-outlined text-[#820AD1] text-lg shrink-0">
            auto_awesome
          </span>
          <p className="text-xs md:text-sm text-gray-600 font-medium leading-relaxed">
            Apenas fale naturalmente sobre a evolução de{" "}
            <span className="text-[#820AD1] font-bold">{patientName}</span>. Eu cuido da
            estrutura para você!
          </p>
        </div>
      </div>
    </div>
  )
}
