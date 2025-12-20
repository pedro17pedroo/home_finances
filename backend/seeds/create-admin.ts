import 'dotenv/config';
import { db } from '../src/core/database/db.js';
import { adminUsers } from '../src/core/database/schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const email = 'admin@financecontrol.ao';
  const password = 'Admin@123';
  
  console.log('🔧 Criando usuário admin...');
  
  // Check if admin already exists
  const existingAdmin = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  
  if (existingAdmin.length > 0) {
    console.log('⚠️  Admin já existe:', email);
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);
    process.exit(0);
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Create admin
  const [admin] = await db.insert(adminUsers).values({
    email,
    password: passwordHash,
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    permissions: JSON.stringify(['all']),
    isActive: true,
  }).returning();
  
  console.log('✅ Admin criado com sucesso!');
  console.log('');
  console.log('📧 Email:', email);
  console.log('🔑 Senha:', password);
  console.log('👤 Nome:', admin.firstName, admin.lastName);
  console.log('🔐 Role:', admin.role);
  console.log('');
  console.log('🌐 Acesse o backoffice em: http://localhost:3002');
  
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error('❌ Erro ao criar admin:', error);
  process.exit(1);
});
