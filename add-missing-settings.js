import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const ADDITIONAL_SETTINGS = [
  { key: 'max_accounts_premium', category: 'features', description: 'Número máximo de contas para plano premium (-1 = ilimitado)', value: -1 },
  { key: 'max_transactions_premium', category: 'features', description: 'Número máximo de transações para plano premium (-1 = ilimitado)', value: -1 },
  { key: 'max_accounts_enterprise', category: 'features', description: 'Número máximo de contas para plano enterprise (-1 = ilimitado)', value: -1 },
  { key: 'max_transactions_enterprise', category: 'features', description: 'Número máximo de transações para plano enterprise (-1 = ilimitado)', value: -1 },
  { key: 'default_locale', category: 'features', description: 'Localização padrão do sistema', value: 'pt-AO' },
  { key: 'currency_symbol', category: 'features', description: 'Símbolo da moeda padrão', value: 'Kz' },
  { key: 'support_phone', category: 'system', description: 'Telefone de suporte técnico', value: '+244 900 000 000' },
  { key: 'company_name', category: 'system', description: 'Nome da empresa', value: 'Sistema de Controle Financeiro' },
  { key: 'landing_hero_title', category: 'content', description: 'Título principal da landing page', value: 'Controle Financeiro Inteligente' },
  { key: 'landing_hero_subtitle', category: 'content', description: 'Subtítulo da landing page', value: 'Gerencie suas finanças pessoais com facilidade e segurança' },
  { key: 'landing_cta_text', category: 'content', description: 'Texto do botão de call-to-action', value: 'Comece seu teste gratuito' }
];

async function addMissingSettings() {
  console.log('🔧 Adicionando configurações de sistema em falta...');

  for (const setting of ADDITIONAL_SETTINGS) {
    try {
      const existing = await sql`SELECT id FROM system_settings WHERE key = ${setting.key}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO system_settings (key, category, description, value, created_at, updated_at)
          VALUES (${setting.key}, ${setting.category}, ${setting.description}, ${JSON.stringify(setting.value)}, NOW(), NOW())
        `;
        console.log(`✅ Configuração criada: ${setting.key}`);
      } else {
        console.log(`⚠️  Configuração já existe: ${setting.key}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar configuração ${setting.key}:`, error);
    }
  }

  console.log('✅ Configurações adicionais concluídas!');
}

addMissingSettings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });