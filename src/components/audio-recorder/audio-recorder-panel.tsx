"use client"

import { useState, useRef, useCallback } from "react"
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
  const [hasRecording, setHasRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const handleRecord = async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Seu navegador não suporta gravação de áudio.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        audioBlobRef.current = blob
        setHasRecording(true)
        stopStream()
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setHasRecording(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao acessar microfone"
      setError(msg)
    }
  }

  const handlePause = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  const handleResume = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    }
  }

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }

  const handleRestart = () => {
    handleStop()
    setRecordingTime(0)
    setHasRecording(false)
    audioBlobRef.current = null
    chunksRef.current = []
    setTimeout(() => handleRecord(), 200)
  }

  const handleCancel = () => {
    handleStop()
    stopStream()
    setRecordingTime(0)
    setHasRecording(false)
    audioBlobRef.current = null
    chunksRef.current = []
    onCancel?.()
  }

  const handleFinish = () => {
    if (isRecording) {
      // Stop recording first, then save after blob is ready
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        const recorder = mediaRecorderRef.current
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" })
          audioBlobRef.current = blob
          stopStream()
          setIsRecording(false)
          setIsPaused(false)
          setHasRecording(true)
          onSave?.(blob, recordingTime)
        }
        recorder.stop()
      }
    } else if (audioBlobRef.current) {
      onSave?.(audioBlobRef.current, recordingTime)
    }
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

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 shrink-0">error</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

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
        {!hasRecording ? (
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            onRecord={handleRecord}
            onPause={handlePause}
            onResume={handleResume}
            onRestart={handleRestart}
            onCancel={handleCancel}
          />
        ) : (
          <div className="flex items-center gap-6 mb-8 w-full justify-center">
            <button
              onClick={handleRestart}
              className="group flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#820AD1] group-hover:border-[#820AD1]/30 group-hover:bg-[#820AD1]/5 transition-all">
                <span className="material-symbols-outlined">restart_alt</span>
              </div>
              <span className="text-xs text-gray-400 group-hover:text-[#820AD1]/80">Regravar</span>
            </button>

            <button
              onClick={handleFinish}
              className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-600 shadow-[0_4px_20px_rgba(22,163,74,0.3)] flex items-center justify-center hover:shadow-[0_4px_30px_rgba(22,163,74,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-white text-4xl md:text-5xl">check</span>
            </button>

            <button
              onClick={handleCancel}
              className="group flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 rounded-full border border-red-200 flex items-center justify-center text-red-400 group-hover:text-red-500 group-hover:border-red-300 group-hover:bg-red-50 transition-all">
                <span className="material-symbols-outlined">close</span>
              </div>
              <span className="text-xs text-red-400/70 group-hover:text-red-500">Descartar</span>
            </button>
          </div>
        )}

        {/* Finish button when recording */}
        {isRecording && (
          <button
            onClick={handleFinish}
            className="mb-4 px-6 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">stop_circle</span>
            Finalizar e Transcrever
          </button>
        )}

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
