#!/bin/bash

# FinanceControl Backend - Deploy Script
# Uso: ./scripts/deploy.sh

set -e

echo "🚀 Iniciando deploy do FinanceControl Backend..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script a partir do diretório backend${NC}"
    exit 1
fi

# 1. Pull das últimas alterações
echo -e "${YELLOW}📥 A obter últimas alterações...${NC}"
git pull origin main

# 2. Instalar dependências
echo -e "${YELLOW}📦 A instalar dependências...${NC}"
npm ci --production

# 3. Build
echo -e "${YELLOW}🔨 A compilar aplicação...${NC}"
npm run build

# 4. Executar migrations (se necessário)
echo -e "${YELLOW}🗄️ A verificar migrations...${NC}"
npm run db:migrate || echo "Migrations já aplicadas ou não necessárias"

# 5. Criar diretórios necessários
echo -e "${YELLOW}📁 A criar diretórios...${NC}"
mkdir -p logs uploads/logos uploads/receipts

# 6. Reiniciar aplicação com PM2
echo -e "${YELLOW}🔄 A reiniciar aplicação...${NC}"
if pm2 describe financecontrol-api > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production
else
    pm2 start ecosystem.config.cjs --env production
fi

# 7. Guardar configuração PM2
pm2 save

# 8. Verificar estado
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
pm2 status

echo ""
echo -e "${GREEN}🎉 Backend atualizado com sucesso!${NC}"
echo -e "   Logs: pm2 logs financecontrol-api"
echo -e "   Status: pm2 status"
