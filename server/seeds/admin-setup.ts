import { db } from '../db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

async function createAdminUser() {
  try {
    console.log('🔧 Setting up admin user...');
    
    const email = 'admin@financecontrol.com';
    const password = 'admin123';
    
    // Check if admin user already exists
    const existingAdmin = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    
    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 12);
    
    // Create the admin user
    await db.insert(adminUsers).values({
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      permissions: [
        'plans.view', 'plans.create', 'plans.update', 'plans.delete', 'plans.manage_pricing',
        'users.view', 'users.create', 'users.update', 'users.delete', 'users.manage_subscriptions',
        'payments.view', 'payments.manage_methods', 'payments.process_refunds',
        'campaigns.view', 'campaigns.create', 'campaigns.update', 'campaigns.delete',
        'content.view', 'content.manage_landing', 'content.manage_legal',
        'system.view_settings', 'system.manage_settings', 'system.view_logs'
      ],
      isActive: true
    });
    
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@financecontrol.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Run if called directly
createAdminUser().then(() => {
  console.log('Admin setup completed');
  process.exit(0);
}).catch((error) => {
  console.error('Admin setup failed:', error);
  process.exit(1);
});

export { createAdminUser };