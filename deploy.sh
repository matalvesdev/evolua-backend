#!/bin/bash
# ==========================================
# Deploy Evolua Backend para AWS App Runner
# ==========================================
# Pré-requisitos:
#   - AWS CLI configurado (aws configure)
#   - Docker instalado e rodando
#
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh
# ==========================================

set -e

# Configurações - ALTERE CONFORME SEU AMBIENTE
AWS_REGION="sa-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="evolua-backend"
IMAGE_TAG="latest"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo "🔧 Região: ${AWS_REGION}"
echo "🔧 Account: ${AWS_ACCOUNT_ID}"
echo "🔧 ECR URI: ${ECR_URI}"
echo ""

# 1. Criar repositório ECR (ignora se já existe)
echo "📦 Criando repositório ECR..."
aws ecr create-repository \
  --repository-name ${ECR_REPO_NAME} \
  --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  2>/dev/null || echo "  Repositório já existe, continuando..."

# 2. Login no ECR
echo "🔐 Fazendo login no ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_URI}

# 3. Build da imagem
echo "🏗️  Fazendo build da imagem Docker..."
docker build -t ${ECR_REPO_NAME}:${IMAGE_TAG} ./backend-evolua

# 4. Tag e push
echo "🚀 Enviando imagem para ECR..."
docker tag ${ECR_REPO_NAME}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
docker push ${ECR_URI}:${IMAGE_TAG}

echo ""
echo "✅ Imagem enviada com sucesso!"
echo "   ${ECR_URI}:${IMAGE_TAG}"
echo ""
echo "📋 Próximos passos no Console AWS:"
echo "   1. Acesse App Runner > Create service"
echo "   2. Source: Container registry > Amazon ECR"
echo "   3. Image URI: ${ECR_URI}:${IMAGE_TAG}"
echo "   4. Port: 8080"
echo "   5. Configure as variáveis de ambiente (veja .env.example)"
echo "   6. Health check path: /api/health"
