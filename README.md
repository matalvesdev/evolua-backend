# Evolua - CRM para Fonoaudiólogos

CRM modular para pequenos consultórios e fonoaudiólogos autônomos. Agilize a criação de relatórios, cadastro de pacientes e comunicação.

## 📁 Estrutura do Projeto

Este projeto segue a arquitetura de **Monolito Modular** com **DDD (Domain-Driven Design)** e **Clean Architecture**.

```text
evolua/
├── apps/
│   └── web/                    # Frontend Next.js
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       └── lib/                # Frontend utilities
│
├── packages/
│   ├── core/                   # Backend/Domain layer
│   │   ├── domain/             # Entidades, Value Objects, Eventos
│   │   ├── application/        # Use Cases, DTOs
│   │   └── infrastructure/     # Repositórios, Serviços externos
│   │
│   └── shared/                 # Utilitários compartilhados
│       ├── utils.ts            # Funções utilitárias
│       └── constants.ts        # Constantes da aplicação
│
└── package.json                # Configuração do monorepo (workspaces)
```

## 🏗️ Arquitetura

### Domain Layer (`packages/core/domain/`)

- **Entidades**: User, Patient, Appointment, Report
- **Value Objects**: Email, Phone, CRFa, DateRange, Money
- **Eventos de Domínio**: UserCreated, PatientRegistered, etc.
- **Interfaces de Repositório**: Contratos para persistência

### Application Layer (`packages/core/application/`)

- **DTOs**: Schemas Zod para validação de entrada/saída
- **Use Cases**: Lógica de aplicação orquestrada

### Infrastructure Layer (`packages/core/infrastructure/`)

- **Repositórios Supabase**: Implementação concreta de persistência
- **Serviços**: Autenticação, Rate Limiting

## 🚀 Como Executar

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build
```

## 🛠️ Scripts Disponíveis

| Script                 | Descrição                                 |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Inicia o frontend em modo desenvolvimento |
| `npm run build`        | Build de produção de todos os workspaces  |
| `npm run build:core`   | Build do pacote @evolua/core              |
| `npm run build:shared` | Build do pacote @evolua/shared            |
| `npm run build:web`    | Build do frontend                         |
| `npm run lint`         | Lint de todos os workspaces               |

## 📦 Packages

### @evolua/core

Backend com DDD e Clean Architecture:

- Agregados de domínio completos
- Validação com Zod
- Repositórios Supabase
- Rate limiting com Upstash

### @evolua/shared

Utilitários compartilhados:

- Funções helper (cn, formatDate, debounce)
- Constantes da aplicação
- Mensagens de erro/sucesso
- Regex patterns

### @evolua/web

Frontend Next.js 16:

- App Router com Turbopack
- shadcn/ui components
- Tailwind CSS v4
- Autenticação Supabase

## 🔐 Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash (Rate Limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## 📝 Licença

Proprietário - Todos os direitos reservados.
