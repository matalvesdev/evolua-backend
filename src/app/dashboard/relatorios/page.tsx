'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useReports } from '@/hooks';
import type { Report } from '@/lib/api/reports';

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  pending_review: { label: 'Em Revisão', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  reviewed: { label: 'Revisado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700 border-green-200' },
  sent: { label: 'Enviado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  archived: { label: 'Arquivado', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const typeIcons: Record<string, { icon: string; color: string }> = {
  evolution: { icon: 'psychology', color: 'text-primary' },
  evaluation: { icon: 'assignment', color: 'text-blue-500' },
  discharge: { icon: 'task_alt', color: 'text-green-500' },
  monthly: { icon: 'calendar_month', color: 'text-purple-500' },
  progress: { icon: 'trending_up', color: 'text-teal-500' },
  school: { icon: 'school', color: 'text-amber-500' },
  medical: { icon: 'medical_information', color: 'text-red-500' },
  custom: { icon: 'edit_note', color: 'text-gray-500' },
};

const typeLabels: Record<string, string> = {
  evolution: 'Evolução',
  evaluation: 'Avaliação',
  discharge: 'Alta',
  monthly: 'Mensal',
  progress: 'Progresso',
  school: 'Escolar',
  medical: 'Médico',
  custom: 'Personalizado',
};

export default function RelatoriosPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const { reports, total, loading } = useReports({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    page,
    limit: 10,
  });

  const getStatusBadge = (status: string) => {
    const config = statusLabels[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getSentBadge = (report: Report) => {
    const isSent = report.status === 'sent' || !!report.sentAt;
    return isSent ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span>
        Enviado
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-400 border border-gray-200">
        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
        Não enviado
      </span>
    );
  };

  const getTypeInfo = (type: string) => {
    const config = typeIcons[type] || { icon: 'description', color: 'text-gray-500' };
    const label = typeLabels[type] || type;
    return { ...config, label };
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none" />

      <div className="max-w-[1200px] mx-auto flex flex-col gap-6 sm:gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-[#161118] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-2">
              Relatórios e Evoluções
            </h1>
            <p className="text-[#7c6189] dark:text-gray-400 text-sm sm:text-base">
              Centralize, gere e organize seus documentos clínicos.
            </p>
          </div>
          <Link
            href="/dashboard/relatorios/novo"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-sm w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Novo Relatório
          </Link>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '20px' }}>search</span>
            <input
              type="text"
              placeholder="Buscar por título ou paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 text-sm bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              className="py-2.5 pl-3 pr-10 text-sm bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none flex-1 sm:flex-none"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos os Tipos</option>
              <option value="evolution">Evolução</option>
              <option value="evaluation">Avaliação</option>
              <option value="discharge">Alta</option>
              <option value="monthly">Mensal</option>
            </select>

            <select
              className="py-2.5 pl-3 pr-10 text-sm bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none flex-1 sm:flex-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos os Status</option>
              <option value="draft">Rascunho</option>
              <option value="pending_review">Em Revisão</option>
              <option value="approved">Aprovado</option>
              <option value="sent">Enviado</option>
            </select>
          </div>
        </div>

        {/* Reports Table / Cards */}
        <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#f3f0f4] dark:border-white/5 flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-bold text-[#161118] dark:text-white">Relatórios</h3>
            <span className="text-xs text-[#7c6189]">{total} relatório(s)</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
              <span className="ml-3 text-sm text-[#7c6189]">Carregando relatórios...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">description</span>
              <p className="text-lg font-medium text-gray-600">Nenhum relatório encontrado</p>
              <p className="text-sm text-gray-400 mt-1">
                {debouncedSearch || statusFilter || typeFilter
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Crie seu primeiro relatório para começar.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/50 dark:bg-white/5 border-b border-[#f3f0f4] dark:border-white/5">
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">Título</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider">Envio</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#7c6189] uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f0f4] dark:divide-white/5">
                    {reports.map((report: Report) => {
                      const typeInfo = getTypeInfo(report.type);
                      return (
                        <tr key={report.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-[#161118] dark:text-white truncate max-w-[220px]">{report.title}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[#161118] dark:text-gray-200">{report.patientName || '—'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined ${typeInfo.color}`} style={{ fontSize: '18px' }}>{typeInfo.icon}</span>
                              <span className="text-sm font-medium text-[#161118] dark:text-gray-200">{typeInfo.label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#7c6189] whitespace-nowrap">
                            {format(new Date(report.createdAt), "dd MMM, yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                          <td className="px-6 py-4">{getSentBadge(report)}</td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/relatorios/novo?reportId=${report.id}`}
                              className="p-1.5 rounded-lg text-[#7c6189] hover:bg-white hover:text-primary transition-all inline-block"
                              title="Editar relatório"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_document</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-[#f3f0f4] dark:divide-white/5">
                {reports.map((report: Report) => {
                  const typeInfo = getTypeInfo(report.type);
                  return (
                    <Link
                      key={report.id}
                      href={`/dashboard/relatorios/novo?reportId=${report.id}`}
                      className="flex flex-col gap-3 p-4 hover:bg-primary/5 transition-colors active:bg-primary/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#161118] dark:text-white truncate">{report.title}</p>
                          <p className="text-xs text-[#7c6189] mt-0.5">{report.patientName || '—'}</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '20px' }}>chevron_right</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className={`material-symbols-outlined ${typeInfo.color}`} style={{ fontSize: '14px' }}>{typeInfo.icon}</span>
                          <span className="text-xs text-[#7c6189]">{typeInfo.label}</span>
                        </div>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-[#7c6189]">
                          {format(new Date(report.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-gray-300">·</span>
                        {getStatusBadge(report.status)}
                        {getSentBadge(report)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-[#f3f0f4] dark:border-white/5 flex items-center justify-between">
              <p className="text-xs text-[#7c6189]">Página {page} de {totalPages}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-primary/10 text-[#7c6189] hover:text-primary transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-primary/10 text-[#7c6189] hover:text-primary transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
