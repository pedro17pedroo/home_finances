import { db } from '../db';
import { plans } from '@shared/schema';

export const seedPlans = async () => {
  console.log('🌱 Seeding plans...');
  
  try {
    // Check if plans already exist
    const existingPlans = await db.select().from(plans);
    
    if (existingPlans.length > 0) {
      console.log('✅ Plans already exist, skipping seed');
      return;
    }

    // Insert default plans
    await db.insert(plans).values([
      {
        name: 'Plano Básico',
        type: 'basic',
        price: '14500.00',
        features: [
          'Até 5 contas bancárias',
          'Controle de receitas e despesas',
          'Relatórios básicos',
          'Suporte por email'
        ],
        maxAccounts: 5,
        maxTransactions: 1000,
        isActive: true
      },
      {
        name: 'Plano Premium',
        type: 'premium',
        price: '29500.00',
        features: [
          'Contas ilimitadas',
          'Transações ilimitadas',
          'Relatórios avançados',
          'Metas de poupança',
          'Gestão de empréstimos',
          'Suporte prioritário'
        ],
        maxAccounts: null,
        maxTransactions: null,
        isActive: true
      },
      {
        name: 'Plano Enterprise',
        type: 'enterprise',
        price: '74500.00',
        features: [
          'Tudo do Premium',
          'Gestão de equipas',
          'Relatórios personalizados',
          'API access',
          'Suporte dedicado',
          'Integração com bancos'
        ],
        maxAccounts: null,
        maxTransactions: null,
        isActive: true
      }
    ]);

    console.log('✅ Plans seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  }
};