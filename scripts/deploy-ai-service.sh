#!/bin/bash
# Deploy do serviço AI (Python FastAPI) na EC2 ARM
# Executar como root ou com sudo

set -euo pipefail

echo "=== Deploy AI Service - Evolua ==="

# 1. Instalar Python 3.12 e dependências do sistema
echo "[1/6] Instalando Python 3.12 e dependências..."
apt-get update
apt-get install -y python3.12 python3.12-venv python3.12-dev build-essential libpq-dev curl

# 2. Criar diretório do serviço
echo "[2/6] Preparando diretório do serviço..."
mkdir -p /opt/evolua/ai
cd /opt/evolua/ai

# 3. Criar ambiente virtual e instalar dependências
echo "[3/6] Instalando dependências Python..."
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Copiar arquivos do projeto (assumindo que estão em /tmp/evolua-ai ou similar)
# Se não existirem, baixar do repositório
if [ ! -f "pyproject.toml" ]; then
    echo "Baixando código do repositório..."
    # Usar o código local se disponível, ou git clone
    # Para agora, assumimos que os arquivos serão copiados manualmente
    echo "AVISO: Copie os arquivos de apps/ai/ para /opt/evolua/ai/ antes de continuar"
fi

pip install .

# 4. Instalar PM2 para gerenciar o processo
echo "[4/6] Instalando PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# 5. Configurar variáveis de ambiente
echo "[5/6] Configurando variáveis de ambiente..."
cat > /opt/evolua/ai/.env << 'EOF'
ENVIRONMENT=production
PORT=8001
LOG_LEVEL=info
INTERNAL_SERVICE_TOKEN=8fe6ff35508654fbbac4ca1624079d4d2fe04f12532b4fe633cd868ab3cf8c63
HUGGINGFACE_API_KEY=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
HUGGINGFACE_BASE_URL=https://router.huggingface.co
HUGGINGFACE_CHAT_MODEL=meta-llama/Llama-3.1-8B-Instruct
HUGGINGFACE_CHAT_PROVIDER=hf-inference
HUGGINGFACE_EMBEDDING_MODEL=intfloat/multilingual-e5-small
HUGGINGFACE_EMBEDDING_DIM=384
HUGGINGFACE_WHISPER_MODEL=openai/whisper-large-v3
DATABASE_URL=postgresql://postgres.diiaoaboykraaiavgdqs:Fm13102330041994!@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
OTEL_ENABLED=false
SENTRY_DSN=https://5e0325188ee670bf474f845a781cfeaa@o4511379685113856.ingest.us.sentry.io/4511379690749952
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENVIRONMENT=production
EOF

# 6. Configurar PM2 para iniciar o serviço
echo "[6/6] Configurando PM2..."
pm2 delete evolua-ai 2>/dev/null || true

pm2 start /opt/evolua/ai/venv/bin/uvicorn \
    --name evolua-ai \
    -- \
    app.main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --workers 2

pm2 save
pm2 startup

# 7. Configurar Nginx como reverse proxy (opcional mas recomendado)
echo "[7/7] Configurando Nginx reverse proxy..."
cat > /etc/nginx/sites-available/evolua-ai << 'EOF'
server {
    listen 8001;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts para transcrição de áudio (pode demorar)
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/evolua-ai /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "=== Deploy concluído! ==="
echo "Verifique o status: pm2 status evolua-ai"
echo "Logs: pm2 logs evolua-ai"
echo "Teste: curl http://localhost:8001/healthz"
