import React from 'react';

interface ReportActionButtonsProps {
  onShare: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function ReportActionButtons({ onShare, onSave, isSaving = false }: ReportActionButtonsProps) {
  return (
    <div className="flex flex-col gap-4 mt-auto pt-4 pb-2">
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button 
          onClick={onShare}
          disabled={isSaving}
          className="flex-1 h-12 rounded-xl border border-purple-200 text-[#820AD1] hover:bg-purple-50 font-bold text-base flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">share</span>
          Compartilhar
        </button>
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="flex-[2] h-12 rounded-xl bg-[#820AD1] hover:bg-[#6D08AF] text-white font-bold text-base shadow-lg shadow-purple-200 hover:shadow-purple-300 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">
            {isSaving ? 'hourglass_empty' : 'save_as'}
          </span>
          {isSaving ? 'Salvando...' : 'Finalizar e Salvar'}
        </button>
      </div>
      
      <div className="flex justify-center items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
        <span className="material-symbols-outlined text-sm text-[#820AD1]">verified_user</span>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
          Estruturado por Evolua IA
        </p>
      </div>
    </div>
  );
}
