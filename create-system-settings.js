// Sistema de Configurações - Dados Essenciais
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const SYSTEM_SETTINGS = [
  {
    key: "trial_duration_days",
    category: "trial",
    description: "Duração do período de teste gratuito em dias",
    value: 14
  },
  {
    key: "max_accounts_basic",
    category: "features",
    description: "Número máximo de contas para plano básico",
    value: 5
  },
  {
    key: "max_transactions_basic",
    category: "features",
    description: "Número máximo de transações por mês no plano básico",
    value: 1000
  },
  {
    key: "email_notifications_enabled",
    category: "notifications",
    description: "Habilitar notificações por email",
    value: true
  },
  {
    key: "stripe_webhook_endpoint",
    category: "payments",
    description: "URL do webhook do Stripe",
    value: "/api/webhooks/stripe"
  },
  {
    key: "session_timeout_minutes",
    category: "security",
    description: "Timeout da sessão em minutos",
    value: 60
  },
  {
    key: "maintenance_mode",
    category: "system",
    description: "Modo de manutenção do sistema",
    value: false
  },
  {
    key: "backup_enabled",
    category: "system",
    description: "Habilitar backup automático",
    value: true
  },
  {
    key: "max_login_attempts",
    category: "security",
    description: "Número máximo de tentativas de login",
    value: 5
  },
  {
    key: "password_min_length",
    category: "security",
    description: "Comprimento mínimo da senha",
    value: 8
  },
  {
    key: "default_currency",
    category: "features",
    description: "Moeda padrão do sistema",
    value: "AOA"
  },
  {
    key: "support_email",
    category: "system",
    description: "Email de suporte técnico",
    value: "suporte@financecontrol.com"
  }
];

async function createSystemSettings() {
  console.log('🔧 Criando configurações do sistema...');
  
  for (const setting of SYSTEM_SETTINGS) {
    try {
      // Verificar se já existe
      const existing = await sql`
        SELECT id FROM system_settings 
        WHERE key = ${setting.key}
      `;
      
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
  
  console.log('✅ Configurações do sistema criadas com sucesso!');
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createSystemSettings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

export { createSystemSettings };