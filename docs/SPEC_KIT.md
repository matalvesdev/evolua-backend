# 📋 Evolua CRM - Spec Kit

> CRM modular para fonoaudiólogos autônomos e pequenos consultórios.  
> **Versão:** 0.1.0  
> **Última atualização:** Janeiro 2026

---

## 📖 Sumário

1. [Visão Geral](#-visão-geral)
2. [Stack Tecnológica](#-stack-tecnológica)
3. [Arquitetura](#-arquitetura)
4. [Estrutura do Projeto](#-estrutura-do-projeto)
5. [Modelo de Dados](#-modelo-de-dados)
6. [Entidades de Domínio](#-entidades-de-domínio)
7. [APIs e Endpoints](#-apis-e-endpoints)
8. [Hooks e State Management](#-hooks-e-state-management)
9. [Componentes UI](#-componentes-ui)
10. [Autenticação e Segurança](#-autenticação-e-segurança)
11. [Funcionalidades](#-funcionalidades)
12. [Guia de Desenvolvimento](#-guia-de-desenvolvimento)

---

## 🎯 Visão Geral

### Objetivo
O **Evolua** é um CRM especializado para fonoaudiólogos, focado em:
- Gestão de pacientes e prontuários
- Agendamento inteligente de sessões
- Geração automatizada de relatórios
- Controle financeiro completo
- Comunicação com pacientes/responsáveis

### Público-Alvo
- Fonoaudiólogos autônomos
- Pequenos consultórios de fonoaudiologia
- Clínicas multidisciplinares

### Proposta de Valor
| Problema | Solução Evolua |
|----------|---------------|
| Relatórios manuais demorados | Geração com IA via transcrição de áudio |
| Agenda desorganizada | Calendário inteligente com lembretes |
| Controle financeiro em planilhas | Dashboard financeiro integrado |
| Comunicação fragmentada | Hub de comunicação centralizado |

---

## 🛠 Stack Tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Next.js** | 16.1.1 | Framework React com App Router |
| **React** | 19.2.3 | Biblioteca UI |
| **TypeScript** | 5.9.3 | Tipagem estática |
| **Tailwind CSS** | 4.x | Estilização |
| **TanStack Query** | 5.x | Cache e sincronização de dados |
| **Zod** | 4.x | Validação de schemas |

### Backend (BaaS)
| Tecnologia | Uso |
|------------|-----|
| **Supabase** | Banco de dados, Auth, Storage |
| **Upstash Redis** | Rate limiting |

### UI Components
| Biblioteca | Uso |
|------------|-----|
| **Radix UI** | Primitivos acessíveis |
| **Lucide React** | Ícones |
| **Tabler Icons** | Ícones adicionais |
| **Shadcn/ui** | Sistema de componentes |

---

## 🏗 Arquitetura

### Padrão: Monolito Modular + DDD + Clean Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │   Hooks     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                        APPLICATION                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Use Cases  │  │    DTOs     │  │  Validators │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                          DOMAIN                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Entities   │  │   Types     │  │ Interfaces  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Repositories│  │  Services   │  │   Supabase  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
User Action → Hook → Use Case → Repository → Supabase → Database
                ↑                    ↓
            React Query ←── Response ←──
```

---

## 📂 Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Layout raiz
│   │   ├── page.tsx                  # Página inicial
│   │   ├── globals.css               # Estilos globais
│   │   ├── api/                      # API Routes
│   │   │   ├── appointments/         # Endpoints de agendamentos
│   │   │   ├── patients/             # Endpoints de pacientes
│   │   │   ├── reports/              # Endpoints de relatórios
│   │   │   └── transcribe/           # Endpoint de transcrição
│   │   ├── auth/                     # Páginas de autenticação
│   │   │   ├── login/                # Login
│   │   │   └── cadastro/             # Registro
│   │   └── dashboard/                # Área logada
│   │       ├── layout.tsx            # Layout do dashboard
│   │       ├── page.tsx              # Home do dashboard
│   │       ├── agendamentos/         # Gestão de agenda
│   │       ├── pacientes/            # Gestão de pacientes
│   │       ├── relatorios/           # Gestão de relatórios
│   │       ├── financeiro/           # Controle financeiro
│   │       ├── tarefas/              # Gestão de tarefas
│   │       └── perfil/               # Perfil do usuário
│   │
│   ├── components/                   # Componentes React
│   │   ├── ui/                       # Componentes base (design system)
│   │   ├── auth/                     # Componentes de autenticação
│   │   ├── calendar/                 # Componentes de calendário
│   │   ├── dashboard/                # Componentes do dashboard
│   │   ├── patients/                 # Componentes de pacientes
│   │   ├── audio/                    # Gravação e transcrição
│   │   └── report-review/            # Revisão de relatórios
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── use-auth.ts               # Autenticação
│   │   ├── use-patients.ts           # Pacientes
│   │   ├── use-appointments.ts       # Agendamentos
│   │   ├── use-reports.ts            # Relatórios
│   │   ├── use-finances.ts           # Finanças
│   │   ├── use-tasks.ts              # Tarefas
│   │   └── use-transactions.ts       # Transações
│   │
│   ├── actions/                      # Server Actions
│   │   ├── auth.actions.ts           # Ações de autenticação
│   │   ├── patient.actions.ts        # Ações de pacientes
│   │   ├── appointment.actions.ts    # Ações de agendamentos
│   │   ├── report.actions.ts         # Ações de relatórios
│   │   └── onboarding.actions.ts     # Ações de onboarding
│   │
│   ├── lib/                          # Utilitários e core
│   │   ├── core/                     # DDD Core
│   │   │   ├── domain/               # Entidades e tipos
│   │   │   ├── application/          # Use cases e DTOs
│   │   │   └── infrastructure/       # Repositórios
│   │   ├── supabase/                 # Cliente Supabase
│   │   ├── security/                 # Utilitários de segurança
│   │   └── validations/              # Schemas de validação
│   │
│   └── types/                        # Tipos TypeScript
│       └── database.types.ts         # Tipos do banco
│
├── supabase/
│   └── schema.sql                    # Schema do banco de dados
│
└── public/                           # Arquivos estáticos
```

---

## 💾 Modelo de Dados

### Diagrama ER

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   CLINICS    │       │    USERS     │       │   PATIENTS   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ clinic_id    │       │ id (PK)      │
│ name         │       │ id (PK)      │◄──────│ therapist_id │
│ crfa         │       │ email        │       │ clinic_id    │──┐
│ address      │       │ full_name    │       │ name         │  │
│ phone        │       │ role         │       │ email        │  │
│ email        │       │ crfa         │       │ phone        │  │
└──────────────┘       │ avatar_url   │       │ birth_date   │  │
                       └──────────────┘       │ status       │  │
                              │               └──────────────┘  │
                              │                      │          │
                              ▼                      ▼          │
                       ┌──────────────┐       ┌──────────────┐  │
                       │ APPOINTMENTS │       │   REPORTS    │  │
                       ├──────────────┤       ├──────────────┤  │
                       │ id (PK)      │       │ id (PK)      │  │
                       │ patient_id   │       │ patient_id   │  │
                       │ therapist_id │       │ therapist_id │  │
                       │ clinic_id    │◄──────│ clinic_id    │◄─┘
                       │ date_time    │       │ type         │
                       │ duration     │       │ status       │
                       │ type         │       │ title        │
                       │ status       │       │ content      │
                       └──────────────┘       └──────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐
│ FINANCIAL_TRANS  │  │    TASKS     │  │PATIENT_REMINDERS│
├──────────────────┤  ├──────────────┤  ├─────────────────┤
│ id (PK)          │  │ id (PK)      │  │ id (PK)         │
│ clinic_id        │  │ clinic_id    │  │ clinic_id       │
│ patient_id       │  │ therapist_id │  │ patient_id      │
│ amount           │  │ title        │  │ type            │
│ type             │  │ type         │  │ message         │
│ category         │  │ status       │  │ action_label    │
│ status           │  │ priority     │  │ due_date        │
│ due_date         │  │ due_date     │  │ completed       │
└──────────────────┘  └──────────────┘  └─────────────────┘
```

### Tabelas

#### `clinics`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome da clínica |
| `crfa` | TEXT | Registro CRFa |
| `address` | TEXT | Endereço completo |
| `city` | TEXT | Cidade |
| `state` | TEXT | Estado |
| `phone` | TEXT | Telefone |
| `email` | TEXT | Email |

#### `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID do auth.users |
| `clinic_id` | UUID | FK para clinics |
| `full_name` | TEXT | Nome completo |
| `email` | TEXT | Email único |
| `phone` | TEXT | Telefone |
| `crfa` | TEXT | Registro CRFa |
| `role` | TEXT | admin, therapist, secretary |
| `avatar_url` | TEXT | URL do avatar |
| `areas_atuacao` | TEXT[] | Áreas de atuação |
| `objetivos` | TEXT[] | Objetivos profissionais |
| `onboarding_completed` | BOOLEAN | Onboarding concluído |

#### `patients`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `clinic_id` | UUID | FK para clinics |
| `therapist_id` | UUID | FK para users |
| `name` | TEXT | Nome do paciente |
| `email` | TEXT | Email |
| `phone` | TEXT | Telefone |
| `birth_date` | DATE | Data de nascimento |
| `cpf` | TEXT | CPF |
| `status` | TEXT | active, inactive, discharged, on-hold |
| `guardian_name` | TEXT | Nome do responsável |
| `guardian_phone` | TEXT | Telefone do responsável |
| `address` | JSONB | Endereço estruturado |
| `medical_history` | JSONB | Histórico médico |

#### `appointments`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `clinic_id` | UUID | FK para clinics |
| `patient_id` | UUID | FK para patients |
| `therapist_id` | UUID | FK para users |
| `date_time` | TIMESTAMPTZ | Data e hora |
| `duration` | INTEGER | Duração em minutos |
| `type` | TEXT | evaluation, session, follow_up, etc. |
| `status` | TEXT | scheduled, confirmed, completed, etc. |
| `session_notes` | TEXT | Notas da sessão |

#### `reports`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `clinic_id` | UUID | FK para clinics |
| `patient_id` | UUID | FK para patients |
| `therapist_id` | UUID | FK para users |
| `type` | TEXT | evaluation, evolution, discharge, etc. |
| `status` | TEXT | draft, pending_review, approved, etc. |
| `title` | TEXT | Título do relatório |
| `content` | TEXT | Conteúdo do relatório |
| `period_start_date` | DATE | Início do período |
| `period_end_date` | DATE | Fim do período |

#### `financial_transactions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `clinic_id` | UUID | FK para clinics |
| `patient_id` | UUID | FK para patients (opcional) |
| `type` | TEXT | income, expense |
| `category` | TEXT | Categoria da transação |
| `amount` | DECIMAL | Valor |
| `status` | TEXT | paid, pending, overdue, cancelled |
| `due_date` | TIMESTAMPTZ | Data de vencimento |
| `paid_date` | TIMESTAMPTZ | Data de pagamento |

#### `tasks`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `clinic_id` | UUID | FK para clinics |
| `therapist_id` | UUID | FK para users |
| `title` | TEXT | Título da tarefa |
| `description` | TEXT | Descrição |
| `type` | TEXT | clinical, admin, general |
| `status` | TEXT | pending, completed, overdue |
| `priority` | TEXT | low, medium, high, urgent |
| `due_date` | TIMESTAMPTZ | Data de vencimento |

---

## 🔷 Entidades de Domínio

### User
```typescript
interface User {
  id: string
  email: string
  name: string
  role: "admin" | "therapist" | "secretary" | "patient"
  status: "active" | "inactive" | "pending"
  clinicId?: string
  crfa?: string
  phone?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### Patient
```typescript
interface Patient {
  id: string
  clinicId: string
  name: string
  email?: string
  phone?: string
  birthDate?: Date
  cpf?: string
  status: "active" | "inactive" | "discharged" | "on-hold"
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  address?: Address
  medicalHistory?: MedicalHistory
  therapistId?: string
  startDate?: Date
  dischargeDate?: Date
  dischargeReason?: string
  createdAt: Date
  updatedAt: Date
}
```

### Appointment
```typescript
interface Appointment {
  id: string
  clinicId: string
  patientId: string
  patientName: string
  therapistId: string
  therapistName: string
  dateTime: Date
  duration: number // minutos
  type: "regular" | "evaluation" | "reevaluation" | "discharge"
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show"
  notes?: string
  cancellationReason?: string
  sessionNotes?: string
  createdAt: Date
  updatedAt: Date
}
```

### Report
```typescript
interface Report {
  id: string
  clinicId: string
  patientId: string
  patientName: string
  therapistId: string
  therapistName: string
  therapistCrfa: string
  type: "evolution" | "evaluation" | "discharge" | "monthly"
  status: "draft" | "pending_review" | "reviewed" | "approved" | "sent"
  title: string
  content: string
  period?: { startDate: Date; endDate: Date }
  reviewedBy?: string
  reviewedAt?: Date
  approvedBy?: string
  approvedAt?: Date
  sentAt?: Date
  sentTo?: string[]
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔌 APIs e Endpoints

### API Routes (Next.js App Router)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/patients` | GET | Lista pacientes |
| `/api/patients` | POST | Cria paciente |
| `/api/patients/[id]` | GET | Obtém paciente |
| `/api/patients/[id]` | PUT | Atualiza paciente |
| `/api/patients/[id]` | DELETE | Remove paciente |
| `/api/appointments` | GET | Lista agendamentos |
| `/api/appointments` | POST | Cria agendamento |
| `/api/appointments/[id]` | PATCH | Atualiza agendamento |
| `/api/reports` | GET | Lista relatórios |
| `/api/reports` | POST | Cria relatório |
| `/api/reports/[id]` | PUT | Atualiza relatório |
| `/api/transcribe` | POST | Transcreve áudio |

### Server Actions

```typescript
// auth.actions.ts
signIn(email: string, password: string): Promise<Result>
signUp(data: SignUpData): Promise<Result>
signOut(): Promise<void>
resetPassword(email: string): Promise<Result>

// patient.actions.ts
createPatient(data: CreatePatientDTO): Promise<Patient>
updatePatient(id: string, data: UpdatePatientDTO): Promise<Patient>
deletePatient(id: string): Promise<void>
dischargePatient(id: string, reason: string): Promise<Patient>

// appointment.actions.ts
createAppointment(data: CreateAppointmentDTO): Promise<Appointment>
cancelAppointment(id: string, reason: string): Promise<Appointment>
completeAppointment(id: string, notes: string): Promise<Appointment>
rescheduleAppointment(id: string, newDateTime: Date): Promise<Appointment>

// report.actions.ts
createReport(data: CreateReportDTO): Promise<Report>
updateReport(id: string, data: UpdateReportDTO): Promise<Report>
submitForReview(id: string): Promise<Report>
approveReport(id: string): Promise<Report>
```

---

## 🪝 Hooks e State Management

### React Query + Custom Hooks

#### `useAuth()`
```typescript
const { user, isLoading, signIn, signUp, signOut } = useAuth()
```

#### `usePatients()`
```typescript
const { 
  patients, 
  isLoading, 
  createPatient, 
  updatePatient, 
  deletePatient 
} = usePatients()
```

#### `useAppointments(filters?)`
```typescript
const { 
  appointments, 
  isLoading, 
  createAppointment, 
  cancelAppointment,
  completeAppointment 
} = useAppointments({ date: new Date() })
```

#### `useReports(filters?)`
```typescript
const { 
  reports, 
  isLoading, 
  createReport, 
  updateReport,
  submitForReview 
} = useReports({ patientId: "..." })
```

#### `useFinances()`
```typescript
const { 
  balanceData,      // { balance, income, pending }
  monthlyData,      // Array<{ month, income, expenses }>
  revenueSources,   // Array<{ name, value, color }>
  transactions,
  createTransaction,
  updateTransaction 
} = useFinances()
```

#### `useTasks()`
```typescript
const { 
  tasks,
  reminders,
  taskCounts,       // { all, clinical, admin, general }
  createTask,
  completeTask,
  deleteTask 
} = useTasks()
```

#### `useTransactions(params)`
```typescript
const { 
  transactions,
  totalCount,
  totalPages,
  markAsPaid,
  markAsPending 
} = useTransactions({
  period: '30days',
  status: 'pending',
  page: 1
})
```

---

## 🎨 Componentes UI

### Design System (Shadcn/ui + Radix)

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Button` | `button.tsx` | Botões com variantes |
| `Input` | `input.tsx` | Campo de entrada |
| `Select` | `select.tsx` | Seleção dropdown |
| `Dialog` | `dialog.tsx` | Modal de diálogo |
| `Sheet` | `sheet.tsx` | Painel deslizante |
| `Card` | `card.tsx` | Container de card |
| `Avatar` | `avatar.tsx` | Avatar de usuário |
| `Badge` | `badge.tsx` | Badge de status |
| `Tabs` | `tabs.tsx` | Navegação por abas |
| `Checkbox` | `checkbox.tsx` | Checkbox acessível |
| `PasswordInput` | `password-input.tsx` | Input de senha com toggle |
| `Combobox` | `combobox.tsx` | Select com busca |

### Componentes de Negócio

| Componente | Uso |
|------------|-----|
| `PatientCard` | Card de resumo do paciente |
| `AppointmentCard` | Card de agendamento |
| `CalendarDayCell` | Célula do calendário |
| `AudioRecorder` | Gravador de áudio |
| `TranscriptionReview` | Revisão de transcrição |
| `ReportEditor` | Editor de relatórios |
| `FinancialChart` | Gráficos financeiros |
| `TaskList` | Lista de tarefas |

---

## 🔐 Autenticação e Segurança

### Fluxo de Autenticação (Supabase Auth)

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐
│  User   │───▶│ Login Form   │───▶│  Supabase   │
└─────────┘    └──────────────┘    │    Auth     │
                     │             └─────────────┘
                     ▼                    │
              ┌──────────────┐           │
              │  JWT Token   │◀──────────┘
              └──────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  Dashboard   │
              └──────────────┘
```

### Row Level Security (RLS)

Todas as tabelas implementam RLS baseado em `clinic_id`:

```sql
-- Exemplo de política
CREATE POLICY "Users can view patients from their clinic"
  ON public.patients FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM public.users 
    WHERE id = auth.uid()
  ));
```

### Rate Limiting

Implementado com Upstash Redis para proteção contra abuso:

```typescript
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})
```

---

## ✨ Funcionalidades

### Módulo de Pacientes
- [x] Cadastro completo de pacientes
- [x] Histórico médico estruturado
- [x] Status de tratamento
- [x] Dados do responsável
- [x] Busca e filtros
- [ ] Importação em massa
- [ ] Exportação de dados

### Módulo de Agendamentos
- [x] Calendário visual
- [x] Tipos de sessão
- [x] Confirmação de presença
- [x] Cancelamento com motivo
- [x] Notas da sessão
- [ ] Recorrência automática
- [ ] Notificações por WhatsApp

### Módulo de Relatórios
- [x] Editor de relatórios
- [x] Tipos pré-definidos
- [x] Workflow de aprovação
- [x] Transcrição de áudio
- [ ] Templates personalizáveis
- [ ] Exportação em PDF
- [ ] Assinatura digital

### Módulo Financeiro
- [x] Dashboard de visão geral
- [x] Receitas e despesas
- [x] Transações por paciente
- [x] Filtros por período
- [x] Gráficos de evolução
- [ ] Emissão de NF
- [ ] Conciliação bancária

### Módulo de Tarefas
- [x] Lista de tarefas
- [x] Prioridades
- [x] Categorias (clínica, admin)
- [x] Lembretes de pacientes
- [ ] Delegação de tarefas
- [ ] Kanban board

---

## 🚀 Guia de Desenvolvimento

### Pré-requisitos

- Node.js 20+
- npm 10+
- Conta no Supabase
- Conta no Upstash (opcional)

### Setup do Ambiente

```bash
# Clone o repositório
git clone <repo-url>
cd fono-v2/frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Execute o schema no Supabase
# Cole o conteúdo de supabase/schema.sql no SQL Editor

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Upstash (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Executa linting |

### Convenções de Código

- **Componentes**: PascalCase (`PatientCard.tsx`)
- **Hooks**: camelCase com prefixo use (`use-patients.ts`)
- **Actions**: kebab-case com sufixo .actions (`patient.actions.ts`)
- **Types**: PascalCase (`Patient`, `Appointment`)
- **CSS**: Tailwind classes, evitar estilos inline

### Criando uma Nova Feature

1. **Entidade** - `src/lib/core/domain/entities/`
2. **Use Cases** - `src/lib/core/application/use-cases/`
3. **Repository** - `src/lib/core/infrastructure/repositories/`
4. **Hook** - `src/hooks/use-{feature}.ts`
5. **Actions** - `src/actions/{feature}.actions.ts`
6. **Componentes** - `src/components/{feature}/`
7. **Páginas** - `src/app/dashboard/{feature}/`

---

## 📚 Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Zod](https://zod.dev/)

---

<div align="center">

**Evolua CRM** © 2026  
Desenvolvido com ❤️ para fonoaudiólogos

</div>
