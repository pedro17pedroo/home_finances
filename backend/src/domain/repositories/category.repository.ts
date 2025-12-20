import { eq, sql, and } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { categories, transactions, type Category, type InsertCategory } from "../../core/database/schema.js";

export class CategoryRepository {
  static async findById(id: number): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findAll(): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .orderBy(categories.type, categories.name);
  }

  static async findByType(type: 'receita' | 'despesa'): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.type, type))
      .orderBy(categories.name);
  }

  static async findByName(name: string): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);
    
    return result[0] || null;
  }

  static async create(data: InsertCategory): Promise<Category> {
    const result = await db
      .insert(categories)
      .values(data)
      .returning();
    
    return result[0];
  }

  static async update(
    id: number,
    data: Partial<InsertCategory>
  ): Promise<Category> {
    const result = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  static async count(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories);
    
    return Number(result[0]?.count || 0);
  }

  static async getTransactionCount(categoryName: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.category, categoryName));
    
    return Number(result[0]?.count || 0);
  }
}