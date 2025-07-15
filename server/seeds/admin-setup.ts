import { db } from '../db';
import { adminUsers, systemSettings } from '@shared/schema';
import { hashAdminPassword, ADMIN_PERMISSIONS } from '../admin-auth';
import { eq } from 'drizzle-orm';

export const seedAdminSetup = async () => {
  console.log('🔧 Setting up admin system...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(adminUsers).limit(1);
    
    if (existingAdmin.length === 0) {
      console.log('Creating default admin user...');
      
      // Create default admin user
      const defaultPassword = await hashAdminPassword('admin123');
      
      await db.insert(adminUsers).values({
        email: 'admin@financecontrol.ao',
        password: defaultPassword,
        firstName: 'Admin',
        lastName: 'System',
        role: 'super_admin',
        permissions: Object.values(ADMIN_PERMISSIONS).flatMap(section => Object.values(section)),
        isActive: true
      });
      
      console.log('✅ Default admin user created');
      console.log('   Email: admin@financecontrol.ao');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change this password after first login!');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Set up default system settings
    const defaultSettings = [
      {
        key: 'trial_duration_days',
        value: 14,
        description: 'Duration of free trial in days',
        category: 'trial'
      },
      {
        key: 'max_trial_accounts',
        value: 5,
        description: 'Maximum accounts allowed during trial',
        category: 'trial'
      },
      {
        key: 'max_trial_transactions',
        value: 100,
        description: 'Maximum transactions allowed during trial',
        category: 'trial'
      },
      {
        key: 'stripe_enabled',
        value: true,
        description: 'Enable Stripe payment processing',
        category: 'payments'
      },
      {
        key: 'maintenance_mode',
        value: false,
        description: 'Enable maintenance mode',
        category: 'system'
      },
      {
        key: 'registration_enabled',
        value: true,
        description: 'Allow new user registrations',
        category: 'system'
      },
      {
        key: 'default_currency',
        value: 'AOA',
        description: 'Default currency for the system',
        category: 'system'
      },
      {
        key: 'company_name',
        value: 'FinanceControl',
        description: 'Company name for branding',
        category: 'branding'
      },
      {
        key: 'support_email',
        value: 'suporte@financecontrol.ao',
        description: 'Support email address',
        category: 'contact'
      },
      {
        key: 'notification_email_enabled',
        value: true,
        description: 'Enable email notifications',
        category: 'notifications'
      }
    ];
    
    // Insert default settings if they don't exist
    for (const setting of defaultSettings) {
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, setting.key))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(systemSettings).values(setting);
      }
    }
    
    console.log('✅ System settings configured');
    console.log('✅ Admin system setup completed');
  } catch (error) {
    console.error('❌ Error setting up admin system:', error);
    throw error;
  }
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminSetup()
    .then(() => {
      console.log('Admin setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin setup failed:', error);
      process.exit(1);
    });
}