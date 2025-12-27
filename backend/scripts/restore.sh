#!/bin/bash
# FinanceControl - Script de Restauro da Base de Dados
# Uso: ./scripts/restore.sh <ficheiro_backup.sql.gz>

set -e

# Carregar variáveis de ambiente
if [ -f .env ]; then
    while IFS='=' read -r key value; do
        # Ignorar linhas vazias e comentários
        [[ -z "$key" || "$key" =~ ^# ]] && continue
        # Remover espaços e exportar
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        export "$key=$value"
    done < .env
fi

# Verificar argumento
if [ -z "$1" ]; then
    echo "❌ Erro: Especifique o ficheiro de backup"
    echo ""
    echo "Uso: ./scripts/restore.sh <ficheiro_backup.sql.gz>"
    echo ""
    echo "📋 Backups disponíveis:"
    ls -lh ./backups/*.sql.gz 2>/dev/null || echo "   Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar se ficheiro existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Ficheiro não encontrado: $BACKUP_FILE"
    exit 1
fi

# Extrair dados da DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não definida"
    exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "⚠️  ATENÇÃO: Este processo irá SUBSTITUIR todos os dados da base de dados!"
echo ""
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Backup: $BACKUP_FILE"
echo ""

# Confirmação
read -p "Tem a certeza que deseja continuar? (escreva 'sim' para confirmar): " CONFIRM
if [ "$CONFIRM" != "sim" ]; then
    echo "❌ Operação cancelada"
    exit 1
fi

echo ""
echo "🔄 Iniciando restauro..."

# Descomprimir se necessário
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Descomprimindo backup..."
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    SQL_FILE="$TEMP_FILE"
else
    SQL_FILE="$BACKUP_FILE"
fi

# Executar restauro
echo "🔄 Restaurando base de dados..."
PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$SQL_FILE" \
    --quiet \
    2>&1 | grep -v "NOTICE" || true

# Limpar ficheiro temporário
if [ -n "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
fi

echo ""
echo "✅ Restauro concluído!"
echo "   Base de dados '$DB_NAME' restaurada com sucesso."
