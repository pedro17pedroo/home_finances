import { db } from '../db';
import { paymentTransactions, plans, paymentMethods, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const seedPaymentTransactions = async () => {
  console.log('🌱 Seeding payment transactions...');
  
  try {
    // Check if transactions already exist
    const existingTransactions = await db.select().from(paymentTransactions);
    
    if (existingTransactions.length > 0) {
      console.log('✅ Payment transactions already exist, skipping seed');
      return;
    }

    // Get first user (for demo purposes)
    const user = await db.select().from(users).limit(1);
    if (user.length === 0) {
      console.log('⚠️  No users found, skipping payment transactions seed');
      return;
    }

    // Get plans and payment methods
    const allPlans = await db.select().from(plans);
    const allPaymentMethods = await db.select().from(paymentMethods);

    if (allPlans.length === 0 || allPaymentMethods.length === 0) {
      console.log('⚠️  No plans or payment methods found, skipping payment transactions seed');
      return;
    }

    const userId = user[0].id;
    const basicPlan = allPlans.find(p => p.type === 'basic');
    const premiumPlan = allPlans.find(p => p.type === 'premium');
    const stripMethod = allPaymentMethods.find(m => m.name === 'stripe');
    const multicaixaMethod = allPaymentMethods.find(m => m.name === 'multicaixa');

    if (!basicPlan || !premiumPlan || !stripMethod || !multicaixaMethod) {
      console.log('⚠️  Required plans or payment methods not found');
      return;
    }

    // Create sample transactions
    const sampleTransactions = [
      {
        userId: userId,
        planId: basicPlan.id,
        paymentMethodId: stripMethod.id,
        amount: basicPlan.price,
        finalAmount: basicPlan.price,
        status: 'completed' as const,
        paymentReference: 'FC1753997001',
        processedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        userId: userId,
        planId: premiumPlan.id,
        paymentMethodId: multicaixaMethod.id,
        amount: premiumPlan.price,
        discountAmount: '5000.00', // 5000 AOA discount
        finalAmount: (parseFloat(premiumPlan.price) - 5000).toString(),
        status: 'completed' as const,
        paymentReference: 'FC1753997002',
        processedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        userId: userId,
        planId: premiumPlan.id,
        paymentMethodId: stripMethod.id,
        amount: premiumPlan.price,
        finalAmount: premiumPlan.price,
        status: 'pending' as const,
        paymentReference: 'FC1753997003',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        userId: userId,
        planId: basicPlan.id,
        paymentMethodId: multicaixaMethod.id,
        amount: basicPlan.price,
        finalAmount: basicPlan.price,
        status: 'failed' as const,
        paymentReference: 'FC1753997004',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      }
    ];

    // Insert sample transactions
    await db.insert(paymentTransactions).values(sampleTransactions);

    console.log(`✅ Inserted ${sampleTransactions.length} sample payment transactions`);
  } catch (error) {
    console.error('❌ Error seeding payment transactions:', error);
    throw error;
  }
};