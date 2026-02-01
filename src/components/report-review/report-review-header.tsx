import React from 'react';

interface ReportReviewHeaderProps {
  progress: number;
}

export function ReportReviewHeader({ progress }: ReportReviewHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full mb-3 border border-green-100">
            <span className="material-symbols-outlined text-green-600 text-sm">check</span>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
              Processamento Concluído
            </span>
          </div>
          <h1 className="text-gray-900 tracking-tight text-[28px] md:text-[32px] font-bold leading-tight">
            Seu relatório está pronto! ✨
          </h1>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex justify-between items-end">
          <p className="text-gray-900 text-sm font-semibold leading-normal">
            Revisão e Finalização
          </p>
          <p className="text-[#820AD1] text-sm font-bold leading-normal">
            {progress}%
          </p>
        </div>
        <div className="rounded-full bg-purple-50 overflow-hidden border border-purple-100">
          <div 
            className="h-2 rounded-full bg-[#820AD1] transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
