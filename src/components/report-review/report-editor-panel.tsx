import React, { useState, useRef, useEffect } from 'react';
import { ReportEditableSection } from './report-editable-section';

interface ReportSection {
  id: string;
  label: string;
  content: string;
  showAIBadge?: boolean;
  hasHighlight?: boolean;
}

interface ReportEditorPanelProps {
  sections: ReportSection[];
  onSectionsChange: (sections: ReportSection[]) => void;
}

export function ReportEditorPanel({ sections, onSectionsChange }: ReportEditorPanelProps) {
  const [history, setHistory] = useState<ReportSection[][]>([sections]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Add to history when sections change
  useEffect(() => {
    const currentSections = JSON.stringify(sections);
    const historySections = history[historyIndex] ? JSON.stringify(history[historyIndex]) : '';
    
    if (currentSections !== historySections) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(sections);
      // Limit history to last 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [sections]);

  const handleUndo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onSectionsChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onSectionsChange(history[newIndex]);
    }
  };
  const handleSectionChange = (index: number, newContent: string) => {
    const updatedSections = sections.map((section, i) => 
      i === index ? { ...section, content: newContent } : section
    );
    onSectionsChange(updatedSections);
  };

  return (
    <div className="flex-1 glass-panel rounded-2xl p-1 shadow-sm flex flex-col relative overflow-hidden mt-2 border-white/60">
      {/* Editor Toolbar */}
      <div className="px-5 py-4 border-b border-gray-100/80 flex justify-between items-center bg-white/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#820AD1]">edit_note</span>
          <span className="font-bold text-sm text-gray-900">Editor Inteligente</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
            title="Desfazer"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
          <button 
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
            title="Refazer"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>
        </div>
      </div>

      {/* Editable Sections */}
      <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[400px] custom-scrollbar bg-white/40">
        {sections.map((section, index) => (
          <ReportEditableSection
            key={section.id}
            label={section.label}
            content={section.content}
            onContentChange={(newContent) => handleSectionChange(index, newContent)}
            showAIBadge={section.showAIBadge}
            hasHighlight={section.hasHighlight}
          />
        ))}
      </div>

      {/* Gradient Fade at Bottom */}
      <div className="h-8 bg-gradient-to-t from-white/90 to-transparent absolute bottom-0 w-full pointer-events-none rounded-b-2xl" />
    </div>
  );
}
