'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const initialSections: ReportSection[] = [
  {
    id: 'queixa',
    label: 'Queixa Principal',
    content: 'Paciente encaminhado pela escola devido a trocas na fala (s/z) e dificuldade de compreensão de instruções complexas. Mãe relata que a criança "parece não ouvir" quando chamada em ambientes ruidosos.',
    showAIBadge: false,
    hasHighlight: false,
  },
  {
    id: 'evolucao',
    label: 'Evolução Clínica',
    content: 'O paciente demonstrou boa adesão aos exercícios de discriminação auditiva. Houve melhora na articulação do fonema /r/ em palavras isoladas, embora ainda persista a omissão em frases espontâneas.',
    showAIBadge: true,
    hasHighlight: true,
  },
  {
    id: 'conduta',
    label: 'Conduta Terapêutica',
    content: 'Manter terapia fonoaudiológica semanal. Iniciar treino de consciência fonológica com apoio familiar. Reavaliação prevista para daqui a 3 meses.',
    showAIBadge: false,
    hasHighlight: false,
  },
];

export default function RevisarRelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [reportTemplate, setReportTemplate] = useState('resumo');
  const [sections, setSections] = useState<ReportSection[]>(initialSections);
  const [progress] = useState(80);
  const [isSaving, setIsSaving] = useState(false);

  const handleTemplateChange = (newTemplate: string) => {
    setReportTemplate(newTemplate);
    console.log('Template changed to:', newTemplate);
    // TODO: Regenerar conteúdo com AI será implementado em uma versão futura
    // quando a integração com API de AI estiver disponível
  };

  const handleShare = () => {
    console.log('Sharing report for patient:', id);
    // Abrir dialog de compartilhamento (implementação futura: PDF, email, WhatsApp)
    alert('Funcionalidade de compartilhamento será implementada em breve. Por enquanto, você pode copiar o conteúdo manualmente.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Criar relatório no Supabase
      const reportContent = sections.map(s => `${s.label}\n${s.content}`).join('\n\n');
      
      // TODO: Implementar com hook useReports quando disponível
      console.log('Saving report:', {
        patientId: id,
        template: reportTemplate,
        content: reportContent,
        sections
      });
      
      // Simular save (substituir por chamada real ao Supabase)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push(`/dashboard/pacientes/${id}/documentos`);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Erro ao salvar relatório. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left Illustration Panel */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#F3E8FF] via-[#E9D5FF] to-[#D8B4FE]">
        {/* Gradient Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/40 rounded-full blur-[100px] mix-blend-overlay" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#820AD1]/10 rounded-full blur-[80px]" />
        
        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col items-center max-w-xl text-center">
          <div className="relative mb-10 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#820AD1] to-purple-400 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000" />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/60">
              <img
                alt="Happy speech therapist smiling while reviewing a successful report on a tablet"
                className="w-full h-[400px] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMJWAAsV1NXwn56WIuqN5PNbVSmUXa3jACQJFC3O28CSgPR7L_eWWH_Oozh5640ytOhZ66YHt4iBc977aQbgYkODqBwhtJ-MHpJMQdT33Ed_FoA5ghIWggvBbBCovoMirnn2q776de-EQJ0yXr5Ui0zuAv5SFALsP3oPqYvWhjYsJp46FgjKKxiYzNWdDS-xJqLIBjQZPla49_cvmFxJ_rJq71ZR8IvjdQmUDtQPQy0Avc1tFn71K-X13mIsCkCuI-xkWqhgxYfJaL"
              />
              
              {/* Success Badge */}
              <div className="absolute top-6 right-6 bg-white rounded-full p-2 shadow-lg animate-bounce duration-[3000ms]">
                <span className="material-symbols-outlined text-green-500 text-2xl font-bold">
                  check_circle
                </span>
              </div>
              
              {/* AI Badge */}
              <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[#820AD1] text-xl">
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
            Sua IA estruturou os dados da sessão. Agora você tem mais tempo para o que realmente importa: seus pacientes.
          </p>
        </div>
      </div>

      {/* Right Editor Panel */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto custom-scrollbar relative flex flex-col bg-[#FDFBFD]">
        {/* Top Gradient */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#F3E8FF]/40 via-transparent to-transparent pointer-events-none" />
        
        {/* Main Content */}
        <div className="flex-1 px-6 py-8 md:px-12 md:py-10 max-w-3xl mx-auto w-full flex flex-col gap-6 relative z-10">
          <ReportReviewHeader progress={progress} />
          
          <ReportTemplateSelector 
            value={reportTemplate}
            onChange={handleTemplateChange}
          />
          
          <ReportEditorPanel 
            sections={sections}
            onSectionsChange={setSections}
          />
          
          <ReportActionButtons 
            onShare={handleShare}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
