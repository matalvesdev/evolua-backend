'use client';

import React, { use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useReport, useReportMutations } from '@/hooks';
import {
  ReportReviewHeader,
  ReportTemplateSelector,
  ReportEditorPanel,
  ReportActionButtons,
} from '@/components/report-review';

interface ReportSection {
  id: string;
  label: string;
  content: string;
  showAIBadge?: boolean;
  hasHighlight?: boolean;
}

function parseContentToSections(content: string): ReportSection[] {
  if (!content || !content.trim()) {
    return [{ id: 'content', label: 'Conteúdo', content: '', showAIBadge: false, hasHighlight: false }];
  }

  const sections: ReportSection[] = [];
  const lines = content.split('\n');
  let currentLabel = 'Conteúdo';
  let currentContent: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (currentContent.length > 0 || sectionIndex > 0) {
        sections.push({
          id: `section-${sectionIndex}`,
          label: currentLabel,
          content: currentContent.join('\n').trim(),
          showAIBadge: false,
          hasHighlight: false,
        });
        sectionIndex++;
      }
      currentLabel = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  sections.push({
    id: `section-${sectionIndex}`,
    label: currentLabel,
    content: currentContent.join('\n').trim(),
    showAIBadge: false,
    hasHighlight: false,
  });

  return sections.filter(s => s.label || s.content);
}

function sectionsToContent(sections: ReportSection[]): string {
  return sections
    .map(s => `## ${s.label}\n${s.content}`)
    .join('\n\n');
}

function RevisarRelatorioContent({ patientId }: { patientId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId') || '';

  const { report, loading } = useReport(reportId);
  const { updateReport, isUpdating } = useReportMutations();

  const [reportTemplate, setReportTemplate] = useState('resumo');
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (report && !initialized) {
      setSections(parseContentToSections(report.content || ''));
      setInitialized(true);
    }
  }, [report, initialized]);

  const progress = sections.filter(s => s.content.trim().length > 0).length / Math.max(sections.length, 1) * 100;

  const handleSave = async () => {
    if (!reportId) return;
    try {
      const content = sectionsToContent(sections);
      await updateReport({ id: reportId, content, status: 'approved' });
      router.push(`/dashboard/pacientes/${patientId}/documentos`);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Erro ao salvar relatório. Tente novamente.');
    }
  };

  const handleShare = () => {
    const content = sectionsToContent(sections);
    navigator.clipboard.writeText(content);
    alert('Conteúdo copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <span className="material-symbols-outlined text-5xl text-gray-300">description</span>
        <p className="text-gray-500">Relatório não encontrado</p>
        <button onClick={() => router.back()} className="text-primary font-bold text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left Illustration Panel */}
      <div className="hidden lg:flex w-1/2 gradient-left-panel flex-col items-center justify-center overflow-hidden">
        <div className="relative z-10 p-12 flex flex-col items-center max-w-xl text-center">
          <div className="mb-8 w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30">
            <span className="material-symbols-outlined text-white text-5xl">edit_document</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Revise e Finalize
          </h2>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Edite as seções do relatório conforme necessário e salve quando estiver satisfeito.
          </p>
          <div className="mt-8 flex gap-3">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 animate-float">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              IA Assistente
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 animate-float" style={{ animationDelay: '1s' }}>
              <span className="material-symbols-outlined text-sm">verified</span>
              Precisão
            </span>
          </div>
        </div>
      </div>

      {/* Right Editor Panel */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto relative flex flex-col bg-[#FDFBFD]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-linear-to-bl from-[#8A05BE]/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex-1 px-6 py-8 md:px-12 md:py-10 max-w-3xl mx-auto w-full flex flex-col gap-6 relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => router.push(`/dashboard/pacientes/${patientId}`)} className="hover:text-[#8A05BE] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-base">person</span>
              Paciente
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{report.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-[#8A05BE] transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900 truncate">{report.title}</h1>
          </div>

          <ReportReviewHeader progress={Math.round(progress)} />
          <ReportTemplateSelector value={reportTemplate} onChange={setReportTemplate} />
          <ReportEditorPanel sections={sections} onSectionsChange={setSections} />
          <ReportActionButtons onShare={handleShare} onSave={handleSave} isSaving={isUpdating} />
        </div>
      </div>
    </div>
  );
}

export default function RevisarRelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>}>
      <RevisarRelatorioContent patientId={id} />
    </Suspense>
  );
}
