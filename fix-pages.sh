#!/bin/bash

# Fix movimentacoes page
cat > /home/mfalves96/projects/fono-v2/frontend/src/app/dashboard/financeiro/movimentacoes/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { TransactionsFilters, TransactionsTableView } from '@/components/transactions'
import { useTransactions } from '@/hooks'

export default function MovimentacoesPage() {
  const [period, setPeriod] = useState('all')
  const [status, setStatus] = useState('all')
  const [patientSearch, setPatientSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { transactions, totalPages, totalCount, loading, error } = useTransactions({
    period: period as 'all' | '30days' | '7days' | 'today',
    status: status as 'all' | 'paid' | 'pending' | 'overdue',
    patientSearch,
    page: currentPage,
    pageSize
  })

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex items-center justify-center">
        <div className="text-[#6b46a8] text-lg">Carregando transações...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex items-center justify-center">
        <div className="text-red-500">Erro ao carregar dados: {error}</div>
      </div>
    )
  }

  const transactionsData = transactions.map(t => {
    const date = new Date(t.created_at)
    return {
      id: t.id,
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      patient: {
        name: t.patient_name || 'Não especificado',
        avatar: undefined,
        initials: t.patient_name?.substring(0, 2).toUpperCase()
      },
      amount: Number(t.amount),
      paymentMethod: t.payment_method || 'Não especificado',
      status: t.status as 'paid' | 'pending' | 'overdue'
    }
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#820AD1]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-[#2d1b4e] dark:text-white">
            Movimentações Financeiras
          </h1>
          <p className="text-[#6b46a8]/70">
            Visualize e gerencie todas as transações financeiras
          </p>
        </div>

        <TransactionsFilters
          period={period}
          onPeriodChange={setPeriod}
          status={status}
          onStatusChange={setStatus}
          patientSearch={patientSearch}
          onPatientSearchChange={setPatientSearch}
          onApplyFilters={() => {}}
        />

        <TransactionsTableView
          transactions={transactionsData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          resultsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onGenerateReceipt={(id) => console.log('Generate receipt:', id)}
          onSendCharge={(id) => console.log('Send charge:', id)}
          onResend={(id) => console.log('Resend:', id)}
        />
      </div>
    </div>
  )
}
EOF

# Fix tarefas page
cat > /home/mfalves96/projects/fono-v2/frontend/src/app/dashboard/tarefas/page.tsx << 'EOF'
'use client'

import { TasksHeader, TaskFilterTabs, TaskItem, SuggestionCard, PatientReminderCard } from '@/components/tasks'
import { useTasks } from '@/hooks'
import { useState } from 'react'

type TaskCategory = 'all' | 'clinical' | 'admin' | 'general'

export default function TarefasPage() {
  const { tasks, reminders, taskCounts, loading, error } = useTasks()
  const [activeFilter, setActiveFilter] = useState<TaskCategory>('all')

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex items-center justify-center">
        <div className="text-[#6b46a8] text-lg">Carregando tarefas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex items-center justify-center">
        <div className="text-red-500">Erro ao carregar dados: {error}</div>
      </div>
    )
  }

  const filteredTasks = activeFilter === 'all' ? tasks : tasks.filter(t => t.type === activeFilter)
  
  const tasksData = filteredTasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    priority: t.priority as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: t.due_date || '',
    type: t.type as 'clinical' | 'admin' | 'general',
    completed: t.completed,
    status: t.status as 'pending' | 'completed' | 'overdue' | 'cancelled'
  }))

  const remindersData = reminders.map(r => ({
    id: r.id,
    patientName: r.patient_name,
    patientAvatar: r.patient_avatar || '/default-avatar.png',
    type: r.type as 'birthday' | 'contract' | 'followup',
    message: r.message,
    actionLabel: r.action_label
  }))

  const suggestions = [
    { type: 'ai' as const, title: 'Organize seus relatórios', description: 'Mantenha seus documentos atualizados', actionLabel: 'Organizar' },
    { type: 'productivity' as const, title: 'Dica de produtividade', description: 'Use templates para economizar tempo', actionLabel: 'Ver Dica' },
    { type: 'documents' as const, title: 'Revise seus agendamentos', description: 'Confira a agenda da próxima semana', actionLabel: 'Revisar' }
  ]

  const currentCount = activeFilter === 'all' ? taskCounts.all : activeFilter === 'clinical' ? taskCounts.clinical : activeFilter === 'admin' ? taskCounts.admin : taskCounts.general

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#820AD1]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        <TasksHeader totalTasks={taskCounts.all} pendingTasks={tasks.filter(t => t.status === 'pending').length} />
        <TaskFilterTabs activeFilter={activeFilter as TaskCategory} onFilterChange={(filter) => setActiveFilter(filter as TaskCategory)} taskCount={currentCount} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {tasksData.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <p className="text-[#6b46a8]/60">Nenhuma tarefa encontrada</p>
              </div>
            ) : (
              tasksData.map(task => (
                <TaskItem key={task.id} task={task} onToggle={(id) => console.log('Toggle:', id)} onDelete={(id) => console.log('Delete:', id)} />
              ))
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-[#2d1b4e] dark:text-white mb-4">Sugestões</h3>
              <div className="space-y-3">
                {suggestions.map((s, idx) => (
                  <SuggestionCard key={idx} {...s} onAction={() => console.log('Action:', s.type)} />
                ))}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-[#2d1b4e] dark:text-white mb-4">Lembretes de Pacientes</h3>
              <div className="space-y-3">
                {remindersData.length === 0 ? (
                  <p className="text-[#6b46a8]/60 text-sm">Nenhum lembrete</p>
                ) : (
                  remindersData.map(reminder => (
                    <PatientReminderCard key={reminder.id} reminder={reminder} onAction={(id) => console.log('Reminder:', id)} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
EOF

echo "Páginas corrigidas com sucesso!"
