# 🎙️ Sistema de Transcrição de Áudio com IA

Este sistema permite gravar, fazer upload e transcrever automaticamente áudios das sessões de fonoaudiologia usando **Hugging Face AI** e **Supabase Storage**.

## 📋 Funcionalidades

### 1. Gravação de Áudio
- Grave áudios diretamente pelo navegador usando o microfone
- Visualização em tempo real da duração da gravação
- Player de áudio para pré-visualização antes do upload
- Suporte para formato WebM

### 2. Upload de Arquivos
- Upload de arquivos de áudio existentes
- Formatos suportados: MP3, WAV, M4A, OGG, WebM
- Tamanho máximo: 100MB
- Validação de tipo e tamanho de arquivo

### 3. Transcrição Automática
- Transcrição automática usando **Whisper Large V3** do Hugging Face
- Suporte para português brasileiro
- Processamento assíncrono
- Indicadores de status (pendente, processando, concluído, falhou)

### 4. Armazenamento Seguro
- Áudios armazenados no **Supabase Storage**
- Bucket privado com autenticação
- Row Level Security (RLS) para acesso controlado
- URLs públicas geradas para acesso aos áudios

## 🏗️ Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   └── transcribe/
│   │       └── route.ts          # API route para transcrição
│   └── dashboard/
│       └── pacientes/
│           └── [id]/
│               └── audio/
│                   └── page.tsx   # Página de sessão de áudio
├── components/
│   └── audio/
│       ├── audio-recorder.tsx    # Componente de gravação
│       ├── audio-uploader.tsx    # Componente de upload
│       └── index.ts
├── hooks/
│   ├── use-audio-upload.ts       # Hook para upload
│   └── use-audio-transcription.ts # Hook para transcrição
└── supabase/
    └── audio-schema.sql           # Schema SQL para áudios
```

## 🗄️ Schema do Banco de Dados

### Tabela `audio_sessions`

```sql
CREATE TABLE audio_sessions (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  therapist_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  audio_duration INTEGER,
  file_size INTEGER,
  transcription TEXT,
  transcription_status TEXT,
  transcription_error TEXT,
  transcribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Bucket de Storage

- Nome: `audio-sessions`
- Tipo: Privado
- Políticas: RLS habilitado para usuários autenticados

## 🔧 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` baseado no `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
HUGGINGFACE_API_KEY=sua_chave_da_huggingface
```

### 2. Executar o Schema SQL

Execute o arquivo `supabase/audio-schema.sql` no seu projeto Supabase:

```bash
# Via Supabase CLI
supabase db push

# Ou via Dashboard
# Copie e cole o conteúdo em SQL Editor
```

### 3. Obter API Key do Hugging Face

1. Acesse [huggingface.co](https://huggingface.co)
2. Crie uma conta ou faça login
3. Vá em Settings > Access Tokens
4. Crie um novo token com permissões de leitura
5. Adicione ao `.env.local`

## 📱 Como Usar

### Para Usuários

1. Acesse a página de um paciente
2. Clique no botão "Áudio/Transcrição"
3. Escolha entre:
   - **Gravar Áudio**: Use o microfone para gravar
   - **Upload**: Envie um arquivo existente
4. Aguarde o processamento automático
5. A transcrição aparecerá automaticamente
6. Use a transcrição para criar relatórios

### Para Desenvolvedores

#### Componente de Gravação

```tsx
import { AudioRecorder } from "@/components/audio"

<AudioRecorder
  patientId="uuid-do-paciente"
  appointmentId="uuid-do-agendamento" // opcional
  onTranscriptionComplete={(text) => {
    console.log("Transcrição:", text)
  }}
/>
```

#### Componente de Upload

```tsx
import { AudioUploader } from "@/components/audio"

<AudioUploader
  patientId="uuid-do-paciente"
  appointmentId="uuid-do-agendamento" // opcional
  onTranscriptionComplete={(text) => {
    console.log("Transcrição:", text)
  }}
/>
```

#### Hook de Upload

```tsx
import { useAudioUpload } from "@/hooks"

const { uploadAudio, uploading, progress, error } = useAudioUpload()

const handleUpload = async (file: File) => {
  const result = await uploadAudio(file, {
    patientId: "uuid",
    onProgress: (p) => console.log(`${p}%`)
  })
}
```

#### Hook de Transcrição

```tsx
import { useAudioTranscription } from "@/hooks"

const { transcribeAudio, transcribing, error } = useAudioTranscription()

const handleTranscribe = async () => {
  const result = await transcribeAudio(audioUrl, {
    audioSessionId: "uuid",
    language: "pt"
  })
}
```

## 🚀 Tecnologias Utilizadas

- **Next.js 14+**: Framework React
- **Supabase**: Backend (Storage + Database)
- **Hugging Face**: IA para transcrição (Whisper Large V3)
- **MediaRecorder API**: Gravação de áudio no navegador
- **TypeScript**: Tipagem estática

## 🎯 Roadmap Futuro

- [ ] Suporte para múltiplos idiomas
- [ ] Análise de sentimento do áudio
- [ ] Identificação de múltiplos falantes
- [ ] Exportação de transcrições em PDF
- [ ] Timestamps na transcrição
- [ ] Edição de transcrições
- [ ] Compartilhamento de áudios
- [ ] Integração com relatórios automáticos

## 🐛 Troubleshooting

### Erro: "Permissão de microfone negada"
- Verifique as permissões do navegador
- Use HTTPS (obrigatório para MediaRecorder)

### Erro: "Erro ao transcrever áudio"
- Verifique se a chave da Hugging Face está configurada
- Confirme que o áudio está em formato suportado
- Verifique os logs da API em `/api/transcribe`

### Erro: "Erro ao fazer upload"
- Verifique o tamanho do arquivo (máx. 100MB)
- Confirme que o bucket `audio-sessions` existe
- Verifique as políticas RLS do Supabase

## 📝 Licença

Este projeto faz parte do sistema Evolua CRM para fonoaudiólogos.
