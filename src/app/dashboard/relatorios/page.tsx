'use client';

import { useState } from 'react';
import { AudioRecordingModal, AudioTranscriptionReviewModal } from '@/components/audio';

interface Report {
  id: string;
  patient: {
    name: string;
    patientId: string;
    avatar?: string;
    initials?: string;
  };
  type: string;
  icon: string;
  iconColor: string;
  date: string;
  status: 'draft' | 'finished' | 'sent';
  action: 'edit' | 'download' | 'view';
}

export default function RelatoriosPage() {
  const [patientSearch, setPatientSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('Últimos 30 dias');
  const [statusFilter, setStatusFilter] = useState('Todos os Status');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');

  const reports: Report[] = [
    {
      id: '1',
      patient: {
        name: 'Ana Souza',
        patientId: '#8392',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBl8G29SjptaNhkbAzIp7H0eonr_RO8l8W0ZmRdTXeD0r1gXYkQ-44vRnO4CoMQrcknC67vQA_a1F06Hk7YjpJJLdLLnz7icSR_fJBQ3Jt-EWLB9YgBbxlZWTEShvoeBzteu2M8wdr7kXk931m_HhOg0QUsGKW7Oebdoehg24GSnZ8X3LV8wQhq2XZqk0vU5Ig3jVkK_hILOrZDCqrxILgGext2xJL2AmR1Jd9RN5eqpZqClCFxBvJz27VxWQ3xGQPeSRMxdBA88VGb',
      },
      type: 'Evolução Cognitiva',
      icon: 'psychology',
      iconColor: 'text-primary',
      date: '14 Nov, 2023',
      status: 'draft',
      action: 'edit',
    },
    {
      id: '2',
      patient: {
        name: 'Carlos Lima',
        patientId: '#1204',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxa5FU70GGvSbf3g7tEtMcqnDw_-LBzJ5edwiiv4j8iYY6EkZetAI-4X8_HqWWffylqm6v7XkC9C2heNfDy8idkAmaZnKgEFM-a9CnN9LTg6yV6R-4PIckH3-E6_VrEP3A5lPf_hdZvww2r56-FxamwGg1McVOeWbOcJS_rGQr1aA2XU7QmafoWFqWS43cagovf6r627HGfPk6mGMN56-4jvfPMI-pxhOM4Ub4HU1OgwXOwamavSWB9mBBF3BX6obZHF0svOlz6mH5',
      },
      type: 'Relatório Mensal',
      icon: 'description',
      iconColor: 'text-blue-500',
      date: '12 Nov, 2023',
      status: 'finished',
      action: 'download',
    },
    {
      id: '3',
      patient: {
        name: 'Beatriz M.',
        patientId: '#9931',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC18muCJkJILRi4Xn45HOXNgBOaQM0L-ZV-g4tcEhhuBSJkXG4-Y6aksJPt4BKVmVqjwIURx2CC7f0gv4l3JANTnJ8JesRLhtCD5ZFTYLZOGAyo6zVmfmh9Ws6B84SZJXnpqkZiH2FeWIXLLQ4qB2V_e2beSTD3yzHw7qUk5knxCQkFctdMm4QKbVoH5HNf3C3lhReEM2Xf1rZrVYHI7H82s0KK6xh25Hgc0S_VrjwK-gKlQaCKp_LDzn6leW_V8ZPw7LShBmcgc2MK',
      },
      type: 'Encaminhamento',
      icon: 'forward_to_inbox',
      iconColor: 'text-purple-500',
      date: '10 Nov, 2023',
      status: 'sent',
      action: 'view',
    },
    {
      id: '4',
      patient: {
        name: 'João D.',
        patientId: '#4421',
        initials: 'JD',
      },
      type: 'Anamnese Inicial',
      icon: 'psychology',
      iconColor: 'text-primary',
      date: '08 Nov, 2023',
      status: 'finished',
      action: 'download',
    },
  ];

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">
            <span className="size-1.5 rounded-full bg-yellow-500"></span>
            Rascunho
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
            <span className="size-1.5 rounded-full bg-green-500"></span>
            Finalizado
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
            <span className="material-symbols-outlined text-[14px]">send</span>
            Enviado
          </span>
        );
    }
  };

  const getActionButton = (action: Report['action']) => {
    const icons = {
      edit: 'edit_document',
      download: 'download',
      view: 'visibility',
    };

    return (
      <button className="p-1.5 rounded-lg text-[#7c6189] hover:bg-white dark:hover:bg-white/10 hover:text-primary transition-all">
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          {icons[action]}
        </span>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
      {/* Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-[#161118] dark:text-white text-3xl lg:text-4xl font-bold tracking-tight mb-2">
              Relatórios e Evoluções
            </h1>
            <p className="text-[#7c6189] dark:text-gray-400 text-base font-normal">
              Centralize, gere e organize seus documentos médicos com inteligência.
            </p>
          </div>
        </div>

        {/* Audio Recording Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#2d1b36] dark:to-[#1c1022] backdrop-blur-md border border-white/60 dark:border-white/10 shadow-lg p-6 lg:p-8 group">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                  mic
                </span>
              </div>
              <div className="max-w-xl">
                <h2 className="text-xl font-bold text-[#161118] dark:text-white mb-2">
                  Gerar Novo Relatório por Áudio
                </h2>
                <p className="text-[#7c6189] dark:text-gray-300 text-sm leading-relaxed">
                  Economize tempo ditando suas observações clínicas. Nossa IA transcreve, estrutura e gera uma evolução pronta para revisão em segundos.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsRecordingModalOpen(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 transition-all duration-200"
            >
              <span className="material-symbols-outlined">mic</span>
              <span>Iniciar Gravação</span>
            </button>
          </div>
        </div>

        {/* Filters and View Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {/* Patient Search */}
            <div className="relative min-w-[240px]">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '18px' }}>
                  person_search
                </span>
              </div>
              <input
                type="text"
                className="block w-full py-2.5 pl-10 pr-3 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                placeholder="Filtrar por paciente..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            {/* Period Filter */}
            <div className="relative min-w-[180px]">
              <select
                className="block w-full py-2.5 pl-3 pr-10 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer appearance-none"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option>Últimos 30 dias</option>
                <option>Esta semana</option>
                <option>Mês passado</option>
                <option>Personalizado</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '18px' }}>
                  expand_more
                </span>
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative min-w-[160px]">
              <select
                className="block w-full py-2.5 pl-3 pr-10 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Todos os Status</option>
                <option>Rascunho</option>
                <option>Finalizado</option>
                <option>Enviado</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '18px' }}>
                  filter_list
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              className={`p-2 rounded-lg border transition-all ${
                viewMode === 'grid'
                  ? 'text-primary bg-primary/10 border-primary/20'
                  : 'text-[#7c6189] bg-white dark:bg-white/5 border-[#f3f0f4] dark:border-white/10 hover:border-primary/30 hover:text-primary'
              }`}
              onClick={() => setViewMode('grid')}
            >
              <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>
                grid_view
              </span>
            </button>
            <button
              className={`p-2 rounded-lg border transition-all ${
                viewMode === 'list'
                  ? 'text-primary bg-primary/10 border-primary/20'
                  : 'text-[#7c6189] bg-white dark:bg-white/5 border-[#f3f0f4] dark:border-white/10 hover:border-primary/30 hover:text-primary'
              }`}
              onClick={() => setViewMode('list')}
            >
              <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>
                view_list
              </span>
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="px-6 py-5 border-b border-[#f3f0f4] dark:border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#161118] dark:text-white">Relatórios Recentes</h3>
            <button className="text-xs font-bold text-primary hover:underline">
              Ver histórico completo
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/50 dark:bg-white/5 border-b border-[#f3f0f4] dark:border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                    Tipo de Relatório
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f0f4] dark:divide-white/5">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                  >
                    {/* Patient */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {report.patient.avatar ? (
                          <div
                            className="size-9 rounded-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${report.patient.avatar})` }}
                          ></div>
                        ) : (
                          <div className="size-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {report.patient.initials}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-[#161118] dark:text-white">
                            {report.patient.name}
                          </p>
                          <p className="text-xs text-[#7c6189]">ID: {report.patient.patientId}</p>
                        </div>
                      </div>
                    </td>

                    {/* Report Type */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined ${report.iconColor}`}
                          style={{ fontSize: '18px' }}
                        >
                          {report.icon}
                        </span>
                        <span className="text-sm font-medium text-[#161118] dark:text-gray-200">
                          {report.type}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-sm text-[#7c6189]">{report.date}</td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">{getActionButton(report.action)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-[#f3f0f4] dark:border-white/5 flex items-center justify-between">
            <p className="text-xs text-[#7c6189] dark:text-gray-400">Mostrando 4 de 12 relatórios</p>
            <div className="flex gap-1">
              <button className="p-1 rounded hover:bg-primary/10 text-[#7c6189] hover:text-primary transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  chevron_left
                </span>
              </button>
              <button className="px-2.5 py-1 rounded bg-primary text-white text-xs font-bold">1</button>
              <button className="px-2.5 py-1 rounded hover:bg-primary/10 text-[#7c6189] hover:text-primary text-xs font-bold transition-colors">
                2
              </button>
              <button className="px-2.5 py-1 rounded hover:bg-primary/10 text-[#7c6189] hover:text-primary text-xs font-bold transition-colors">
                3
              </button>
              <button className="p-1 rounded hover:bg-primary/10 text-[#7c6189] hover:text-primary transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Recording Modal */}
      <AudioRecordingModal
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        patientName={selectedPatientForRecording}
        patientId={selectedPatientId}
        onTranscriptionComplete={(transcription, audioUrl) => {
          console.log('Transcription:', transcription);
          console.log('Audio URL:', audioUrl);
          setCurrentTranscription(transcription);
          setCurrentAudioUrl(audioUrl);
          setIsRecordingModalOpen(false);
          // Abrir modal de revisão após fechar o de gravação
          setTimeout(() => setIsReviewModalOpen(true), 300);
        }}
      />

      {/* Audio Transcription Review Modal */}
      <AudioTranscriptionReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        transcription={currentTranscription}
        patientName={selectedPatientForRecording}
        onSave={(data) => {
          console.log('Report saved:', data);
          // TODO: Salvar relatório no banco de dados
          setIsReviewModalOpen(false);
        }}
      />
    </div>
  );
}
