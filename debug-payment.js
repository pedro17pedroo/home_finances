import { db } from './server/db.js';
import { plans, paymentMethods } from './shared/schema.js';

console.log('=== Debugging Payment Issue ===');

// Check plans
console.log('\n1. Checking plans in database:');
const allPlans = await db.select().from(plans);
allPlans.forEach(plan => {
  console.log(`   - ID: ${plan.id}, Name: ${plan.name}, Type: ${plan.type}, Price: ${plan.price}`);
});

// Check payment methods
console.log('\n2. Checking payment methods:');
const allPaymentMethods = await db.select().from(paymentMethods);
allPaymentMethods.forEach(method => {
  console.log(`   - ID: ${method.id}, Name: ${method.name}, Display: ${method.displayName}`);
});

// Test the exact request that's failing
console.log('\n3. Testing payment initiation with basic plan:');
const basicPlan = allPlans.find(p => p.type === 'basic');
if (basicPlan) {
  console.log(`   - Found basic plan: ID ${basicPlan.id}, Name: ${basicPlan.name}`);
  
  // Test with a payment method
  const firstPaymentMethod = allPaymentMethods[0];
  if (firstPaymentMethod) {
    console.log(`   - Using payment method: ID ${firstPaymentMethod.id}, Name: ${firstPaymentMethod.name}`);
    
    // Simulate the exact request
    console.log('\n4. Simulating payment request:');
    console.log(`   - planId: ${basicPlan.id}`);
    console.log(`   - paymentMethodId: ${firstPaymentMethod.id}`);
  }
} else {
  console.log('   - ERROR: Basic plan not found!');
}

process.exit(0);