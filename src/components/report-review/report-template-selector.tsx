import React from 'react';

interface ReportTemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReportTemplateSelector({ value, onChange }: ReportTemplateSelectorProps) {
  return (
    <div className="grid gap-2">
      <label className="text-gray-900 text-sm font-semibold">
        Modelo de Relatório
      </label>
      <div className="relative group">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-14 pl-4 pr-10 rounded-xl bg-white border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1] outline-none transition-all appearance-none cursor-pointer hover:border-[#820AD1]/40 shadow-sm"
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
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px] text-[#820AD1]">info</span>
        A IA reajustará o conteúdo ao mudar o modelo.
      </p>
    </div>
  );
}
