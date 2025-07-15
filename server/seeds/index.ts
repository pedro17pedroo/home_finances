import { seedPlans } from './plans';

export const runSeeds = async () => {
  console.log('🌱 Running database seeds...');
  
  try {
    await seedPlans();
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