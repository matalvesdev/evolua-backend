"use client";

import { useState, useRef } from "react";

interface AudioTranscriptionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription?: string;
  patientName?: string;
  onSave?: (data: {
    template: string;
    content: {
      complaint: string;
      evolution: string;
      conduct: string;
    };
  }) => void;
}

export function AudioTranscriptionReviewModal({
  isOpen,
  onClose,
  transcription: _transcription = "",
  patientName: _patientName = "Paciente",
  onSave,
}: AudioTranscriptionReviewModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("resumo");
  const [complaint] = useState(
    "Paciente encaminhado pela escola devido a trocas na fala (s/z) e dificuldade de compreensão de instruções complexas. Mãe relata que a criança \"parece não ouvir\" quando chamada em ambientes ruidosos."
  );
  const [evolution] = useState(
    "O paciente demonstrou boa adesão aos exercícios de discriminação auditiva. Houve melhora na articulação do fonema /r/ em palavras isoladas, embora ainda persista a omissão em frases espontâneas."
  );
  const [conduct] = useState(
    "Manter terapia fonoaudiológica semanal. Iniciar treino de consciência fonológica com apoio familiar. Reavaliação prevista para daqui a 3 meses."
  );

  const complaintRef = useRef<HTMLDivElement>(null);
  const evolutionRef = useRef<HTMLDivElement>(null);
  const conductRef = useRef<HTMLDivElement>(null);

  const handleUndo = () => {
    document.execCommand("undo", false);
  };

  const handleRedo = () => {
    document.execCommand("redo", false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        template: selectedTemplate,
        content: {
          complaint: complaintRef.current?.innerText || complaint,
          evolution: evolutionRef.current?.innerText || evolution,
          conduct: conductRef.current?.innerText || conduct,
        },
      });
    }
    onClose();
  };

  const handleShare = () => {
    // TODO: Implementar compartilhamento
    console.log("Compartilhar relatório");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <style jsx>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 30px rgba(138, 5, 190, 0.03);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #d1ced6;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #8a05be;
        }
      `}</style>

      <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* Left Section - Illustration (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#F3E8FF] via-[#E9D5FF] to-[#D8B4FE]">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/40 rounded-full blur-[100px] mix-blend-overlay" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#8A05BE]/10 rounded-full blur-[80px]" />

          <div className="relative z-10 p-12 flex flex-col items-center max-w-xl text-center">
            <div className="relative mb-10 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#8A05BE] to-purple-400 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/60">
                <img
                  alt="Happy speech therapist smiling while reviewing a successful report on a tablet"
                  className="w-full h-[400px] object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMJWAAsV1NXwn56WIuqN5PNbVSmUXa3jACQJFC3O28CSgPR7L_eWWH_Oozh5640ytOhZ66YHt4iBc977aQbgYkODqBwhtJ-MHpJMQdT33Ed_FoA5ghIWggvBbBCovoMirnn2q776de-EQJ0yXr5Ui0zuAv5SFALsP3oPqYvWhjYsJp46FgjKKxiYzNWdDS-xJqLIBjQZPla49_cvmFxJ_rJq71ZR8IvjdQmUDtQPQy0Avc1tFn71K-X13mIsCkCuI-xkWqhgxYfJaL"
                />
                <div className="absolute top-6 right-6 bg-white rounded-full p-2 shadow-lg animate-bounce">
                  <span className="material-symbols-outlined text-green-500 text-2xl font-bold">
                    check_circle
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">
                    auto_awesome
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    Análise IA Concluída
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-[#2d1b36] mb-3 tracking-tight">
              Eficiência que transforma
            </h2>
            <p className="text-lg text-gray-700 max-w-md leading-relaxed">
              Sua IA estruturou os dados da sessão. Agora você tem mais tempo para o que
              realmente importa: seus pacientes.
            </p>
          </div>
        </div>

        {/* Right Section - Editor */}
        <div className="w-full lg:w-1/2 h-full overflow-y-auto custom-scrollbar relative flex flex-col bg-[#FDFBFD]">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#F3E8FF]/40 via-transparent to-transparent pointer-events-none" />

          <div className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full flex flex-col gap-5 relative z-10">
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full mb-2 border border-green-100">
                    <span className="material-symbols-outlined text-green-600 text-sm">
                      check
                    </span>
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                      Processamento Concluído
                    </span>
                  </div>
                  <h1 className="text-gray-900 tracking-tight text-2xl md:text-[26px] font-bold leading-tight">
                    Seu relatório está pronto! ✨
                  </h1>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-end">
                  <p className="text-gray-900 text-sm font-semibold leading-normal">
                    Revisão e Finalização
                  </p>
                  <p className="text-primary text-sm font-bold leading-normal">80%</p>
                </div>
                <div className="rounded-full bg-purple-50 overflow-hidden border border-purple-100">
                  <div className="h-2 rounded-full bg-primary" style={{ width: "80%" }} />
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div className="grid gap-2">
              <label className="text-gray-900 text-sm font-semibold">
                Modelo de Relatório
              </label>
              <div className="relative group">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer hover:border-primary/40 shadow-sm"
                >
                  <option value="resumo">Resumo de Sessão (Padrão)</option>
                  <option value="encaminhamento">Encaminhamento Escolar</option>
                  <option value="mensal">Relatório de Evolução Mensal</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">
                  info
                </span>
                A IA reajustará o conteúdo ao mudar o modelo.
              </p>
            </div>

            {/* Editor Panel */}
            <div className="flex-1 glass-panel rounded-2xl p-1 shadow-sm flex flex-col relative overflow-hidden mt-2 border-white/60">
              {/* Toolbar */}
              <div className="px-5 py-4 border-b border-gray-100/80 flex justify-between items-center bg-white/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit_note</span>
                  <span className="font-bold text-sm text-gray-900">Editor Inteligente</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 transition-colors"
                    title="Desfazer"
                  >
                    <span className="material-symbols-outlined text-[18px]">undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 transition-colors"
                    title="Refazer"
                  >
                    <span className="material-symbols-outlined text-[18px]">redo</span>
                  </button>
                </div>
              </div>

              {/* Content Sections */}
              <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[350px] custom-scrollbar bg-white/40">
                {/* Queixa Principal */}
                <div className="group/section">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block group-hover/section:text-primary transition-colors">
                    Queixa Principal
                  </label>
                  <div
                    ref={complaintRef}
                    className="text-sm text-gray-800 leading-relaxed outline-none focus:bg-white p-2.5 -m-2.5 rounded-lg transition-all border border-transparent focus:border-primary/20 focus:shadow-sm"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {complaint}
                  </div>
                </div>

                {/* Evolução Clínica */}
                <div className="group/section">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover/section:text-primary transition-colors">
                      Evolução Clínica
                    </label>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">
                        auto_awesome
                      </span>{" "}
                      Sugestão IA
                    </span>
                  </div>
                  <div
                    ref={evolutionRef}
                    className="text-sm text-gray-800 leading-relaxed outline-none focus:bg-white p-2.5 -m-2.5 rounded-lg transition-all border border-transparent focus:border-primary/20 focus:shadow-sm"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {evolution}
                  </div>
                </div>

                {/* Conduta Terapêutica */}
                <div className="group/section">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block group-hover/section:text-primary transition-colors">
                    Conduta Terapêutica
                  </label>
                  <div
                    ref={conductRef}
                    className="text-sm text-gray-800 leading-relaxed outline-none focus:bg-white p-2.5 -m-2.5 rounded-lg transition-all border border-transparent focus:border-primary/20 focus:shadow-sm"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {conduct}
                  </div>
                </div>
              </div>

              {/* Gradient Fade */}
              <div className="h-8 bg-gradient-to-t from-white/90 to-transparent absolute bottom-0 w-full pointer-events-none rounded-b-2xl" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-auto pt-3 pb-2">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 h-10 rounded-xl border border-purple-200 text-primary hover:bg-purple-50 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  Compartilhar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] h-10 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-purple-200 hover:shadow-purple-300 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">save_as</span>
                  Finalizar e Salvar
                </button>
              </div>

              {/* Footer Badge */}
              <div className="flex justify-center items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                <span className="material-symbols-outlined text-sm text-primary">
                  verified_user
                </span>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                  Estruturado por Evolua IA
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
