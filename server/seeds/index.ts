import { seedPlans } from './plans';
import { seedPaymentMethods } from './payment-methods';
import { seedPaymentTransactions } from './payment-transactions';

export const runSeeds = async () => {
  console.log('🌱 Running database seeds...');
  
  try {
    await seedPlans();
    await seedPaymentMethods();
    await seedPaymentTransactions();
    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    process.exit(1);
  }
};

// Run seeds if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeds();
}