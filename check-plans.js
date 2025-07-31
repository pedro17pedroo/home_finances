import { db } from './server/db.js';
import { plans } from './shared/schema.js';

console.log('Verificando planos existentes...');
const existingPlans = await db.select().from(plans);
console.log('Planos encontrados:', existingPlans.length);
existingPlans.forEach(plan => {
  console.log(`- ID: ${plan.id}, Nome: ${plan.name}, Tipo: ${plan.type}, Preço: ${plan.price}`);
});

process.exit(0);