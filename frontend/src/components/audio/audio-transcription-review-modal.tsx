"use client";

import { useState, useRef, useEffect } from "react";

interface AudioTranscriptionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription?: string;
  patientName?: string;
  onSave?: (data: {
    template: string;
    content: string;
  }) => void | Promise<void>;
}

export function AudioTranscriptionReviewModal({
  isOpen,
  onClose,
  transcription = "",
  patientName = "Paciente",
  onSave,
}: AudioTranscriptionReviewModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("resumo");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync transcription into editable content when modal opens
  useEffect(() => {
    if (isOpen && transcription) {
      setEditedContent(transcription);
    }
  }, [isOpen, transcription]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editedContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.({
        template: selectedTemplate,
        content: editedContent,
      });
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] glass-card rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Transcrição Concluída</h2>
              <p className="text-xs text-gray-500">
                Paciente: <span className="font-semibold text-primary">{patientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Template Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Modelo de Relatório</label>
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full h-11 pl-4 pr-10 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer hover:border-primary/40 shadow-sm"
              >
                <option value="resumo">Resumo de Sessão (Padrão)</option>
                <option value="encaminhamento">Encaminhamento Escolar</option>
                <option value="mensal">Relatório de Evolução Mensal</option>
                <option value="avaliacao">Relatório de Avaliação Inicial</option>
                <option value="alta">Relatório de Alta</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          {/* Editable Transcription */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900">Conteúdo da Transcrição</label>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Copiar"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[250px] p-4 bg-transparent text-sm text-gray-800 leading-relaxed outline-none resize-none"
                placeholder="A transcrição do áudio aparecerá aqui para edição..."
              />
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">info</span>
              Edite livremente o texto antes de salvar como relatório.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !editedContent.trim()}
            className="flex-2 h-11 rounded-xl bg-[#8A05BE] hover:bg-[#6D08AF] text-white font-bold text-sm shadow-lg shadow-[#8A05BE]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">
              {isSaving ? 'hourglass_empty' : 'save_as'}
            </span>
            {isSaving ? 'Salvando...' : 'Salvar como Relatório'}
          </button>
        </div>

        {/* Footer Badge */}
        <div className="flex justify-center items-center gap-1.5 pb-3 opacity-60">
          <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            Estruturado por Evolua IA
          </p>
        </div>
      </div>
    </div>
  );
}
