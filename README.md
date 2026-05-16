# Evolua Backend v2.0

Backend monorepo de 3 stacks:

- **`apps/api/`** — Fastify + TypeScript + Zod + Prisma · API principal · porta `3000`
- **`apps/ai/`** — FastAPI + LangChain + pgvector · IA/RAG · porta `8001`
- **`apps/services/whatsapp/`** — Go + chi · gateway WhatsApp · porta `8010`
- **`contracts/`** — Schemas Zod (fonte única de verdade) · gera tipos Python (Pydantic) e Go (struct) via `npm run codegen`
- **`prisma/`** — Schema Postgres + migrations (Supabase)
- **`_legacy/`** — código NestJS antigo (será deletado após migração completa)

## Arquitetura

```
                 ┌─────────────────┐
   browser ────▶│ Fastify API     │── Postgres (Supabase)
                │ JWT + Zod + RLS │
                └────┬──────┬─────┘
                     │      │ x-internal-token + x-user-id
                     ▼      ▼
              ┌────────┐  ┌──────────────┐
              │ AI svc │  │ WhatsApp svc │
              │ Python │  │ Go           │
              └────────┘  └──────────────┘
```

- Fastify é o **único** ponto que valida JWT do Supabase. Microserviços confiam em headers internos (`x-user-id`, `x-internal-token`).
- Comunicação inter-serviços: REST/JSON. Contratos compartilhados em `contracts/` (Zod) com codegen para Python/Go.
- Banco Postgres do Supabase é compartilhado. Prisma (TS) escreve dados de domínio; AI service usa pgvector para embeddings.

## Setup local

```bash
# 1. Variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/ai/.env.example apps/ai/.env
cp apps/services/whatsapp/.env.example apps/services/whatsapp/.env

# 2. Instalar deps Node + gerar Prisma client
npm install
npm run prisma:generate

# 3. Aplicar migrations (apenas se usando Postgres local; Supabase já tem)
npm run prisma:migrate

# 4. Rodar a API
npm run dev:api          # http://localhost:3000/docs

# 5. Rodar o serviço AI (Python)
cd apps/ai && pip install -e .
cd ../.. && npm run dev:ai

# 6. Rodar o serviço WhatsApp (Go)
cd apps/services/whatsapp && go mod download
cd ../../.. && npm run dev:wa
```

## Codegen de contratos

Após editar qualquer schema Zod em `contracts/src/`:

```bash
npm run codegen
```

Gera:
- `apps/ai/app/contracts.py` — Pydantic
- `apps/services/whatsapp/internal/contracts/contracts.go` — structs Go

## Estrutura `apps/api/`

```
src/
├── server.ts              # entrypoint
├── app.ts                 # buildApp() — registra plugins + routes
├── config/env.ts          # validação Zod das env vars
├── lib/
│   ├── prisma.ts          # singleton PrismaClient
│   └── supabase.ts        # admin + per-user clients
├── plugins/
│   ├── auth.ts            # @fastify/jwt c/ secret Supabase
│   └── error-handler.ts   # Zod / Prisma / fallback
└── modules/
    ├── auth/
    │   └── auth.helpers.ts  # resolveClinicId(userId)
    ├── health/
    │   └── health.routes.ts # /healthz, /readyz
    └── patients/            # ✅ vertical end-to-end completa
        ├── patients.service.ts
        └── patients.routes.ts
```

## Próximos passos (migração NestJS → Fastify)

Módulos do `_legacy/src/` a serem reescritos em Fastify (em ordem sugerida):

- [x] **patients**
- [ ] auth (login/signup, refresh, logout)
- [ ] appointments
- [ ] reports
- [ ] tasks
- [ ] treatment-plans
- [ ] patient-goals
- [ ] clinical-protocols
- [ ] exercises
- [ ] therapeutic-materials
- [ ] finances
- [ ] messages
- [ ] notifications
- [ ] dashboard
- [ ] patient-portal

Funcionalidades migradas para microserviços:

- [ ] **whatsapp** (NestJS `wa-crm` → Go service) — envio + webhook
- [ ] **google-calendar** (NestJS → Go service futuro)
- [ ] **web-push** (NestJS `notifications` parcial → Go service futuro)
- [ ] **audio transcription** (NestJS `audio` → AI service Python com Whisper)

Funcionalidades migradas para AI service Python:

- [ ] **library RAG chat** (frontend `biblioteca.tsx`)
- [ ] **clinical evolution generation** (frontend `sessao.tsx` pós-sessão)
- [ ] **therapeutic material generation** (frontend `materiais.tsx`)
- [ ] **medical record assistant** (assistente integrado ao prontuário)
