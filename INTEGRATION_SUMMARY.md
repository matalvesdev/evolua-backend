# Integração Supabase - Resumo

> **Última atualização:** 18/01/2026  
> **Status:** ✅ Hooks implementados e prontos para uso

## 📊 Banco de Dados

### Tabelas Criadas

#### 1. `financial_transactions`
- Transações financeiras (receitas e despesas)
- Campos: patient_id, patient_name, amount, type, category, payment_method, status, due_date, paid_date
- Tipos: income, expense
- Status: paid, pending, overdue, cancelled
- RLS habilitado por clinic_id

#### 2. `tasks`
- Tarefas do terapeuta
- Campos: title, description, type, status, priority, due_date, completed_at, completed
- Tipos: clinical, admin, general
- Status: pending, completed, overdue, cancelled
- Prioridade: low, medium, high, urgent
- RLS habilitado por clinic_id

#### 3. `patient_reminders`
- Lembretes relacionados a pacientes
- Campos: patient_id, patient_name, patient_avatar, type, message, action_label, due_date, completed
- Tipos: birthday, contract, followup, appointment, payment
- RLS habilitado por clinic_id

#### 4. `audio_sessions` (Nova)
- Sessões de gravação de áudio com transcrição
- Campos: patient_id, therapist_id, audio_url, transcription, transcription_status, duration_seconds
- Status de transcrição: pending, processing, completed, failed
- RLS habilitado por clinic_id

### Funcionalidades do Schema
- ✅ Auto-update de `updated_at` via triggers
- ✅ Índices otimizados para queries frequentes
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Foreign keys com ON DELETE CASCADE

---

## 🎣 Hooks Implementados

### 1. `useFinances()`
**Arquivo:** `src/hooks/use-finances.ts`  
**Status:** ✅ Totalmente implementado com Supabase

**Retorna:**
```typescript
{
  balanceData: { balance: number, income: number, expenses: number, pending: number }
  monthlyData: Array<{ month: string, income: number, expenses: number }>
  revenueSources: Array<{ name: string, value: number, color: string }>
  transactions: Transaction[]
  loading: boolean
  error: string | null
  createTransaction(data): Promise<Transaction>
  updateTransaction(id, data): Promise<Transaction>
  deleteTransaction(id): Promise<void>
  refreshData(): Promise<void>
}
```

**Funcionalidades:**
- ✅ Calcula saldo total (receitas - despesas)
- ✅ Calcula receitas, despesas e valores pendentes
- ✅ Gera dados mensais dos últimos 6 meses
- ✅ Agrupa receitas por categoria com cores
- ✅ CRUD completo de transações
- ✅ Integração real com Supabase

---

### 2. `useTransactions(params)`
**Arquivo:** `src/hooks/use-transactions.ts`  
**Status:** ✅ Totalmente implementado com Supabase

**Parâmetros:**
```typescript
{
  period?: 'all' | '30days' | '7days' | 'today'
  status?: 'all' | 'paid' | 'pending' | 'overdue' | 'cancelled'
  type?: 'all' | 'income' | 'expense'
  patientSearch?: string
  page?: number
  pageSize?: number
}
```

**Retorna:**
```typescript
{
  transactions: Transaction[]
  totalCount: number
  totalPages: number
  currentPage: number
  loading: boolean
  error: string | null
  createTransaction(data): Promise<Transaction>
  updateTransaction(id, data): Promise<Transaction>
  deleteTransaction(id): Promise<void>
  markAsPaid(id): Promise<Transaction>
  markAsPending(id): Promise<Transaction>
  markAsOverdue(id): Promise<Transaction>
  cancelTransaction(id): Promise<Transaction>
  refreshData(): Promise<void>
}
```

**Funcionalidades:**
- ✅ Filtros por período (hoje, 7 dias, 30 dias, todos)
- ✅ Filtros por status e tipo
- ✅ Busca por nome do paciente
- ✅ Paginação integrada com Supabase
- ✅ Ações rápidas (marcar como pago/pendente/atrasado/cancelar)
- ✅ CRUD completo de transações

---

### 3. `useTasks(params)`
**Arquivo:** `src/hooks/use-tasks.ts`  
**Status:** ✅ Totalmente implementado com Supabase

**Parâmetros:**
```typescript
{
  type?: 'all' | 'clinical' | 'admin' | 'general'
  status?: 'all' | 'pending' | 'completed' | 'overdue' | 'cancelled'
  includeCompleted?: boolean
}
```

**Retorna:**
```typescript
{
  tasks: Task[]
  reminders: Reminder[]
  taskCounts: { all: number, clinical: number, admin: number, general: number }
  loading: boolean
  error: string | null
  // Operações de Tarefas
  createTask(data): Promise<Task>
  updateTask(id, data): Promise<Task>
  deleteTask(id): Promise<void>
  completeTask(id): Promise<Task>
  reopenTask(id): Promise<Task>
  // Operações de Lembretes
  createReminder(data): Promise<Reminder>
  updateReminder(id, data): Promise<Reminder>
  deleteReminder(id): Promise<void>
  completeReminder(id): Promise<Reminder>
  refreshData(): Promise<void>
}
```

**Funcionalidades:**
- ✅ Lista tarefas com filtros por tipo e status
- ✅ Contagem de tarefas por categoria
- ✅ Lista lembretes de pacientes não completados
- ✅ CRUD completo de tarefas
- ✅ CRUD completo de lembretes
- ✅ Ações de completar/reabrir tarefas

---

## 📄 Páginas - Status de Integração

### 1. Financeiro (`/dashboard/financeiro`)
**Arquivo:** `src/app/dashboard/financeiro/page.tsx`  
**Status:** ⚠️ Pendente integração com hook

A página existe mas ainda usa dados estáticos. Necessário:
- [ ] Importar e usar `useFinances()`
- [ ] Conectar cartões de visão geral
- [ ] Integrar gráfico de evolução mensal
- [ ] Integrar gráfico de fontes de receita

---

### 2. Movimentações (`/dashboard/financeiro/movimentacoes`)
**Arquivo:** `src/app/dashboard/financeiro/movimentacoes/page.tsx`  
**Status:** ⚠️ Pendente integração com hook

Necessário:
- [ ] Importar e usar `useTransactions()`
- [ ] Conectar filtros aos parâmetros do hook
- [ ] Integrar tabela paginada
- [ ] Implementar ações de cobrança/recibo

---

### 3. Tarefas (`/dashboard/tarefas`)
**Arquivo:** `src/app/dashboard/tarefas/page.tsx`  
**Status:** ⚠️ Parcialmente integrada

Usa `useAppointments` mas não `useTasks`. Necessário:
- [ ] Importar e usar `useTasks()`
- [ ] Conectar lista de tarefas
- [ ] Integrar lembretes de pacientes
- [ ] Implementar ações de completar/criar tarefas

---

## 🔒 Segurança (RLS)

Todas as tabelas implementam Row Level Security:

```sql
-- Exemplo de política RLS
CREATE POLICY "Users can view transactions from their clinic"
  ON public.financial_transactions FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM public.users 
    WHERE id = auth.uid()
  ));
```

**Políticas criadas:**
- SELECT: Usuários só veem dados da própria clínica
- INSERT: Só podem criar dados para sua clínica
- UPDATE: Só atualizam dados da própria clínica
- DELETE: Só deletam dados da própria clínica

---

## ✅ Checklist de Implementação

### Backend/Schema
- [x] Schema do banco de dados criado (`supabase/schema.sql`)
- [x] Tabela `financial_transactions` com RLS
- [x] Tabela `tasks` com RLS
- [x] Tabela `patient_reminders` com RLS
- [x] Tabela `audio_sessions` com RLS
- [x] Índices otimizados para todas as tabelas
- [x] Triggers de auto-update `updated_at`
- [x] Types TypeScript gerados (`src/types/database.types.ts`)

### Hooks (Lógica de Negócio)
- [x] Hook `useFinances()` implementado com Supabase
- [x] Hook `useTransactions()` implementado com Supabase
- [x] Hook `useTasks()` implementado com Supabase

### Páginas (UI)
- [ ] Página de finanças integrada com `useFinances()`
- [ ] Página de movimentações integrada com `useTransactions()`
- [ ] Página de tarefas integrada com `useTasks()`

### Testes
- [ ] Testar CRUD de transações
- [ ] Testar CRUD de tarefas
- [ ] Testar CRUD de lembretes
- [ ] Verificar RLS funcionando corretamente

---

## 🚀 Próximos Passos

1. **Aplicar o schema no Supabase:**
   ```bash
   # No Supabase Studio SQL Editor, execute:
   # Conteúdo de supabase/schema.sql
   ```

2. **Integrar páginas com os hooks:**
   - Atualizar `/dashboard/financeiro/page.tsx` para usar `useFinances()`
   - Atualizar `/dashboard/financeiro/movimentacoes/page.tsx` para usar `useTransactions()`
   - Atualizar `/dashboard/tarefas/page.tsx` para usar `useTasks()`

3. **Criar Storage Bucket (para áudio):**
   - Criar bucket `audio-sessions` no Supabase Storage
   - Configurar políticas de acesso

4. **Testar a aplicação:**
   ```bash
   npm run dev
   ```

5. **Funcionalidades Futuras:**
   - Modais de criação/edição de transações
   - Gráficos interativos com drill-down
   - Exportação de relatórios em PDF
   - Notificações de lembretes
   - Dashboard analytics avançado

---

## 📝 Notas Importantes

- Todas as queries usam o `clinic_id` do usuário autenticado
- Dados são filtrados automaticamente por RLS
- Paginação implementada no backend (Supabase)
- Estados de loading e erro tratados em todos os hooks
- Hooks são independentes e podem ser usados em qualquer componente

---

**Data de Criação:** Janeiro 2026  
**Última Atualização:** 18/01/2026  
**Versão:** v1.1.0  
**Status:** ✅ Hooks implementados | ⚠️ Integração de páginas pendente
