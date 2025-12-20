#!/usr/bin/env tsx

/**
 * Script para aplicar migração de suporte a recibos
 * Execute com: npm run migrate:receipts
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { logger } from '../core/utils/logger.js';

// Carregar variáveis de ambiente
config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function migrateReceiptSupport() {
  try {
    logger.info('Iniciando migração de suporte a recibos...');

    // Executar migração SQL
    await sql`
      -- Adicionar colunas de recibo à tabela transactions
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS receipt_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS receipt_mime_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS receipt_original_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS receipt_file_size INTEGER;
    `;

    await sql`
      -- Adicionar índice para consultas de recibos
      CREATE INDEX IF NOT EXISTS idx_transactions_receipt 
      ON transactions(receipt_path) 
      WHERE receipt_path IS NOT NULL;
    `;

    await sql`
      -- Adicionar índice para transações com recibos por usuário
      CREATE INDEX IF NOT EXISTS idx_transactions_user_receipt 
      ON transactions(user_id, receipt_path) 
      WHERE receipt_path IS NOT NULL;
    `;

    await sql`
      -- Adicionar comentários para documentação
      COMMENT ON COLUMN transactions.receipt_path IS 'Relative path to receipt file in uploads directory';
      COMMENT ON COLUMN transactions.receipt_mime_type IS 'MIME type of the receipt file (image/jpeg, application/pdf, etc.)';
      COMMENT ON COLUMN transactions.receipt_original_name IS 'Original filename of the uploaded receipt';
      COMMENT ON COLUMN transactions.receipt_file_size IS 'File size in bytes of the receipt';
    `;

    logger.info('✅ Migração de suporte a recibos concluída com sucesso!');
    
    // Verificar se as colunas foram criadas
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name LIKE 'receipt_%'
      ORDER BY column_name;
    `;

    logger.info('Colunas de recibo criadas:');
    result.forEach((col: any) => {
      logger.info(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } catch (error) {
    logger.error('❌ Erro na migração de suporte a recibos:', error);
    process.exit(1);
  }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateReceiptSupport()
    .then(() => {
      logger.info('Migração finalizada.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erro fatal na migração:', error);
      process.exit(1);
    });
}

export { migrateReceiptSupport };