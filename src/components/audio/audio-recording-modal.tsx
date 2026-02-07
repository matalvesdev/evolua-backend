"use client";

import { useEffect, useState, useRef } from "react";

interface AudioRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  patientId?: string;
  onTranscriptionComplete?: (transcription: string, audioUrl: string) => void;
}

export function AudioRecordingModal({
  isOpen,
  onClose,
  patientName = "Paciente",
  patientId,
  onTranscriptionComplete,
}: AudioRecordingModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    setError(null);
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta gravação de áudio. Use Chrome, Firefox ou Edge.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        setAudioChunks(chunks);
        
        // Process audio if callback provided
        if (onTranscriptionComplete && patientId) {
          setIsProcessing(true);
          try {
            // TODO: Implementar upload e transcrição quando a API estiver pronta
            // const result = await uploadAndTranscribe(audioBlob, patientId);
            // onTranscriptionComplete(result.transcription, result.audioUrl);
            
            // Por enquanto, simular processamento
            setTimeout(() => {
              onTranscriptionComplete(
                "Transcrição simulada do áudio gravado...",
                URL.createObjectURL(audioBlob)
              );
              setIsProcessing(false);
            }, 2000);
          } catch (error) {
            console.error("Error processing audio:", error);
            setError("Erro ao processar o áudio. Tente novamente.");
            setIsProcessing(false);
          }
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error: unknown) {
      console.error("Error accessing microphone:", error);
      
      // Provide specific error messages
      let errorMessage = "Não foi possível acessar o microfone.";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage = "Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador e tente novamente.";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          errorMessage = "Nenhum microfone foi encontrado. Conecte um microfone e tente novamente.";
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          errorMessage = "O microfone está sendo usado por outro aplicativo. Feche outros programas e tente novamente.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage = "As configurações de áudio não são suportadas pelo seu dispositivo.";
        } else if (error.name === "TypeError") {
          errorMessage = "Erro ao inicializar gravação. Verifique se está usando HTTPS ou localhost.";
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Restart recording
  const restartRecording = () => {
    stopRecording();
    setRecordingTime(0);
    setAudioChunks([]);
    setTimeout(() => startRecording(), 100);
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioChunks([]);
    onClose();
  };

  // Toggle recording (start/stop)
  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <style jsx>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(138, 5, 190, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(138, 5, 190, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(138, 5, 190, 0); }
        }
        .pulse-animation {
          animation: pulse-ring 2s infinite cubic-bezier(0.66, 0, 0, 1);
        }
        @keyframes sound-wave {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .wave-bar {
          animation: sound-wave 1.2s ease-in-out infinite;
          border-radius: 9999px;
        }
        .wave-bar:nth-child(odd) { animation-duration: 0.8s; }
        .wave-bar:nth-child(2n) { animation-duration: 1.1s; }
        .wave-bar:nth-child(3n) { animation-duration: 1.3s; }
        .wave-bar:nth-child(4n) { animation-duration: 0.9s; }
        .wave-bar:nth-child(5n) { animation-duration: 1.5s; }
      `}</style>

      <div className="w-full max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row max-w-4xl">
        {/* Left Section - Illustration */}
        <section className="relative w-full md:w-1/2 min-h-[250px] md:min-h-[450px] bg-gradient-to-br from-[#F3E5F5] via-[#E1BEE7] to-[#D1C4E9] overflow-hidden flex items-center justify-center p-6">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-300/30 rounded-full blur-[80px]" />
          
          <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center md:items-start md:text-left gap-6">
            <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-xl border border-white/40 bg-white/20 backdrop-blur-sm">
              <div 
                className="w-full h-full bg-center bg-cover"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDBFeqDAdUO0uJ-ajqPTEPa9CAXfxsSQg-L9JNlLj7Qy9Sp5djMgF-AphZgtNFEI8z5jKTEXbp1r7qx7AdQd2vNuznbyG8AfPRXpiQbuzwKbJYznq9HmLCxwQVT_MYlwa6xVwTsRIEo5GfOXmzQZrj1vCjnSlkr-QnCRTWl6X4J2627yr7-EFc36bWjiTprB7qGXm8upIIhEc1xKzk2aaQp_etne_yMkwumBduYu7pGJ-3ojLshtEat21D6OkgfXsCF_LXW5tFkNiNd')" }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#4A148C] via-transparent to-transparent opacity-90" />
              </div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h2 className="text-2xl font-bold mb-1.5 leading-tight">Fluxo Criativo</h2>
                <p className="text-white/90 text-base font-normal">
                  Transforme sua voz em relatórios estruturados instantaneamente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Recording Interface */}
        <section className="relative w-full md:w-1/2 flex flex-col items-center justify-center p-4 md:p-8 bg-[#F9F8FA]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-multiply" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="bg-white/75 backdrop-blur-xl border border-white/80 shadow-lg w-full max-w-md rounded-2xl p-5 md:p-7 flex flex-col relative z-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group"
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
                    Paciente: <span className="text-primary font-bold">{patientName}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-xl flex-shrink-0">
                  error
                </span>
                <div className="flex-1">
                  <h4 className="text-red-900 font-semibold text-sm mb-1">
                    Erro ao Acessar Microfone
                  </h4>
                  <p className="text-red-700 text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}

            {/* Recording Display */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 min-h-[160px] py-6">
              {/* Timer */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-gray-500 text-[10px] font-semibold tracking-[0.2em] uppercase">
                  Tempo Decorrido
                </span>
                <div className="text-5xl md:text-6xl font-bold text-gray-900 tabular-nums tracking-tighter">
                  {formatTime(recordingTime)}
                </div>
              </div>

              {/* Sound Wave Animation */}
              <div className="flex items-center justify-center h-16 md:h-24 w-full gap-1 md:gap-2 px-4 md:px-12">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 md:w-2 bg-gradient-to-t from-primary/30 to-primary wave-bar ${
                      isRecording && !isPaused ? "" : "opacity-30"
                    }`}
                    style={{
                      height: isRecording && !isPaused 
                        ? `${[50, 75, 100, 66, 33, 75, 100, 50, 25, 66, 100, 75, 50, 33, 66][i]}%`
                        : "20%",
                      animationPlayState: isRecording && !isPaused ? "running" : "paused"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center w-full mt-auto pt-6">
              <div className="flex items-center gap-6 md:gap-8 mb-6 w-full justify-center">
                {/* Restart Button */}
                <button
                  onClick={restartRecording}
                  disabled={!isRecording}
                  className="group flex flex-col items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                    <span className="material-symbols-outlined text-xl">restart_alt</span>
                  </div>
                  <span className="text-[10px] text-gray-400 group-hover:text-primary/80">Reiniciar</span>
                </button>

                {/* Record/Stop Button */}
                <button
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary shadow-[0_4px_20px_rgba(138,5,190,0.3)] flex items-center justify-center hover:shadow-[0_4px_30px_rgba(138,5,190,0.5)] transition-all hover:scale-105 active:scale-95 z-10 ${
                    isRecording && !isPaused ? "pulse-animation" : ""
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="material-symbols-outlined text-white text-3xl md:text-4xl">
                    {isProcessing ? "hourglass_empty" : isRecording ? "stop" : "mic"}
                  </span>
                </button>

                {/* Cancel Button */}
                <button
                  onClick={cancelRecording}
                  className="group flex flex-col items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="w-10 h-10 rounded-full border border-red-200 flex items-center justify-center text-red-400 group-hover:text-red-500 group-hover:border-red-300 group-hover:bg-red-50 transition-all">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </div>
                  <span className="text-[10px] text-red-400/70 group-hover:text-red-500">Cancelar</span>
                </button>
              </div>

              {/* Hint */}
              <div className="bg-white/60 border border-primary/10 rounded-full px-4 py-2 md:px-5 md:py-2.5 flex items-start md:items-center gap-2 max-w-sm shadow-sm backdrop-blur-md">
                <span className="material-symbols-outlined text-primary text-base shrink-0">
                  auto_awesome
                </span>
                <p className="text-[11px] md:text-xs text-gray-600 font-medium leading-relaxed">
                  Apenas fale naturalmente sobre a evolução de{" "}
                  <span className="text-primary font-bold">{patientName}</span>. Eu cuido da estrutura para você!
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
