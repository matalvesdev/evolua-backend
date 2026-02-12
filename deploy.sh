#!/bin/bash
# ==========================================
# Deploy Evolua Backend para AWS App Runner
# ==========================================
# Uso:
#   ./deploy.sh dev     → deploy para desenvolvimento
#   ./deploy.sh prod    → deploy para produção
# ==========================================

set -e

ENV=${1:-dev}

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "❌ Uso: ./deploy.sh [dev|prod]"
  exit 1
fi

AWS_REGION="sa-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ "$ENV" = "prod" ]; then
  ECR_REPO_NAME="evolua-backend-prod"
  IMAGE_TAG="latest"
else
  ECR_REPO_NAME="evolua-backend-dev"
  IMAGE_TAG="latest"
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo "🌍 Ambiente: ${ENV}"
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
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 3. Build da imagem
echo "🏗️  Fazendo build da imagem Docker..."
docker build -t ${ECR_REPO_NAME}:${IMAGE_TAG} ./backend-evolua

# 4. Tag e push
echo "🚀 Enviando imagem para ECR..."
docker tag ${ECR_REPO_NAME}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
docker push ${ECR_URI}:${IMAGE_TAG}

echo ""
echo "✅ Imagem enviada com sucesso! [${ENV}]"
echo "   ${ECR_URI}:${IMAGE_TAG}"
echo ""
echo "📋 No Console AWS (App Runner):"
echo "   1. Image URI: ${ECR_URI}:${IMAGE_TAG}"
echo "   2. Port: 8080"
echo "   3. Health check: /api/health"
echo "   4. Variáveis: veja .env.${ENV == 'prod' && 'production' || 'development'}"
