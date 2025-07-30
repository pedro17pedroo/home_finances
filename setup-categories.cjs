const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');

async function setupCategories() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Check if categories already exist
    const existingCategories = await db.execute("SELECT * FROM categories LIMIT 1");
    
    if (existingCategories.rows.length > 0) {
      console.log('✅ Categories already exist');
      return;
    }

    // Insert default categories
    const categories = [
      { name: 'Alimentação', type: 'despesa', color: '#FF6B6B' },
      { name: 'Moradia', type: 'despesa', color: '#4ECDC4' },
      { name: 'Transporte', type: 'despesa', color: '#45B7D1' },
      { name: 'Lazer', type: 'despesa', color: '#FFA07A' },
      { name: 'Saúde', type: 'despesa', color: '#98D8C8' },
      { name: 'Educação', type: 'despesa', color: '#F7DC6F' },
      { name: 'Outros', type: 'despesa', color: '#BB8FCE' },
      { name: 'Salário', type: 'receita', color: '#52C41A' },
      { name: 'Freelance', type: 'receita', color: '#1890FF' },
      { name: 'Investimentos', type: 'receita', color: '#722ED1' },
      { name: 'Outros', type: 'receita', color: '#13C2C2' }
    ];

    for (const category of categories) {
      await db.execute(`
        INSERT INTO categories (name, type, color)
        VALUES ($1, $2, $3)
      `, [category.name, category.type, category.color]);
    }

    console.log(`✅ Created ${categories.length} categories successfully`);
    
  } catch (error) {
    console.error('❌ Error creating categories:', error);
  }
}

setupCategories();
