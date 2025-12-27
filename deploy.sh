#!/bin/bash
# FinanceControl - Script de Deploy para Produção
# Uso: ./deploy.sh [backend|frontend|backoffice|all]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório base
BASE_DIR=$(dirname "$(readlink -f "$0")")

echo -e "${GREEN}🚀 FinanceControl Deploy Script${NC}"
echo "=================================="

deploy_backend() {
    echo -e "${YELLOW}📦 Deploying Backend...${NC}"
    cd "$BASE_DIR/backend"
    
    # Instalar dependências
    npm ci --production
    
    # Build
    npm run build
    
    # Migrations
    npm run db:migrate || true
    
    # Restart PM2
    if pm2 list | grep -q "financecontrol-api"; then
        pm2 reload financecontrol-api
    else
        pm2 start ecosystem.config.cjs --env production
        pm2 save
    fi
    
    echo -e "${GREEN}✅ Backend deployed!${NC}"
}

deploy_frontend() {
    echo -e "${YELLOW}🌐 Deploying Frontend...${NC}"
    cd "$BASE_DIR/frontend"
    
    # Instalar dependências
    npm ci
    
    # Build
    npm run build
    
    echo -e "${GREEN}✅ Frontend deployed! Files in: frontend/dist/${NC}"
}

deploy_backoffice() {
    echo -e "${YELLOW}🔐 Deploying Backoffice...${NC}"
    cd "$BASE_DIR/backoffice"
    
    # Instalar dependências
    npm ci
    
    # Build
    npm run build
    
    echo -e "${GREEN}✅ Backoffice deployed! Files in: backoffice/dist/${NC}"
}

# Verificar argumento
case "${1:-all}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    backoffice)
        deploy_backoffice
        ;;
    all)
        deploy_backend
        deploy_frontend
        deploy_backoffice
        echo ""
        echo -e "${GREEN}🎉 All components deployed successfully!${NC}"
        ;;
    *)
        echo "Uso: $0 [backend|frontend|backoffice|all]"
        exit 1
        ;;
esac

echo ""
echo "Deploy completed at $(date)"
