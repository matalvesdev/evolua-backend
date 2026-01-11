import React from 'react';

interface ReportEditableSectionProps {
  label: string;
  content: string;
  onContentChange: (content: string) => void;
  showAIBadge?: boolean;
  hasHighlight?: boolean;
}

export function ReportEditableSection({ 
  label, 
  content, 
  onContentChange,
  showAIBadge = false,
  hasHighlight = false 
}: ReportEditableSectionProps) {
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onContentChange(e.currentTarget.textContent || '');
  };

  return (
    <div className="group/section">
      <div className="flex justify-between mb-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover/section:text-[#820AD1] transition-colors">
          {label}
        </label>
        {showAIBadge && (
          <span className="text-[10px] bg-[#820AD1]/10 text-[#820AD1] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
            Sugestão IA
          </span>
        )}
      </div>
      
      <div 
        className="text-base text-gray-800 leading-relaxed outline-none focus:bg-white p-3 -m-3 rounded-lg transition-all border border-transparent focus:border-[#820AD1]/20 focus:shadow-sm"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ 
          __html: hasHighlight 
            ? content.replace(
                /boa adesão aos exercícios/g, 
                '<span class="bg-[#820AD1]/10 border-b-2 border-[#820AD1]/30 text-[#6D08AF] px-1 pb-0.5 rounded cursor-help relative group/tooltip font-medium">boa adesão aos exercícios<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-gray-900 text-white text-xs p-2 rounded hidden group-hover/tooltip:block z-50 text-center shadow-lg">IA detectou alta confiança neste trecho</span></span>'
              )
            : content 
        }}
      />
    </div>
  );
}
