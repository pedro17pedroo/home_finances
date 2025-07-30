const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const bcryptjs = require('bcryptjs');

async function createAdminUser() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Check if admin already exists
    const existingAdmin = await db.execute("SELECT * FROM admin_users WHERE email = 'admin@financecontrol.com'");
    
    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash('admin123', 10);

    // Insert admin user
    await db.execute(`
      INSERT INTO admin_users (email, password, first_name, last_name, role, permissions, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'admin@financecontrol.com',
      hashedPassword,
      'Sistema',
      'Admin',
      'super_admin',
      JSON.stringify(['*']),
      true
    ]);

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@financecontrol.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
