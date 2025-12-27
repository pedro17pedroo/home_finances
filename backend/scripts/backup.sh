#!/bin/bash
# FinanceControl - Script de Backup da Base de Dados
# Uso: ./scripts/backup.sh [nome_opcional]

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

# Configurações
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup_$TIMESTAMP}"

# Extrair dados da DATABASE_URL
# Formato: postgresql://user:password@host:port/database
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

# Criar diretório de backups
mkdir -p "$BACKUP_DIR"

# Nome do ficheiro
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

echo "🔄 Iniciando backup da base de dados..."
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Destino: $BACKUP_FILE_GZ"

# Executar backup
PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "$BACKUP_FILE"

# Comprimir
gzip -f "$BACKUP_FILE"

# Mostrar tamanho
SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)

echo "✅ Backup concluído!"
echo "   Ficheiro: $BACKUP_FILE_GZ"
echo "   Tamanho: $SIZE"

# Limpar backups antigos (manter últimos 7)
if [ "$KEEP_BACKUPS" != "false" ]; then
    echo "🧹 Limpando backups antigos (mantendo últimos 7)..."
    ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
fi

echo "📋 Backups disponíveis:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "   Nenhum backup encontrado"
