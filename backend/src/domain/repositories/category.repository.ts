import { eq, sql, and, isNull, or } from "drizzle-orm";
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

  static async findByIdAndUser(id: number, userId: number): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, id),
        eq(categories.userId, userId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  // Find by ID and organization
  static async findByIdAndOrganization(id: number, organizationId: number): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, id),
        eq(categories.organizationId, organizationId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  static async findAll(): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .orderBy(categories.type, categories.name);
  }

  static async findAllByUser(userId: number): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.type, categories.name);
  }

  // Find all by organization
  static async findAllByOrganization(organizationId: number): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.organizationId, organizationId))
      .orderBy(categories.type, categories.name);
  }

  // Find by organization or user (for migration period)
  static async findByOrganizationOrUser(organizationId: number | null, userId: number): Promise<Category[]> {
    if (organizationId) {
      return this.findAllByOrganization(organizationId);
    }
    return this.findAllByUser(userId);
  }

  static async findByType(type: 'receita' | 'despesa'): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.type, type))
      .orderBy(categories.name);
  }

  static async findByTypeAndUser(type: 'receita' | 'despesa', userId: number): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(and(
        eq(categories.type, type),
        eq(categories.userId, userId)
      ))
      .orderBy(categories.name);
  }

  // Find by type and organization
  static async findByTypeAndOrganization(type: 'receita' | 'despesa', organizationId: number): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(and(
        eq(categories.type, type),
        eq(categories.organizationId, organizationId)
      ))
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

  static async findByNameAndUser(name: string, userId: number): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.name, name),
        eq(categories.userId, userId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  // Find by name and organization
  static async findByNameAndOrganization(name: string, organizationId: number): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.name, name),
        eq(categories.organizationId, organizationId)
      ))
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

  static async countByUser(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(eq(categories.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  // Count by organization
  static async countByOrganization(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(eq(categories.organizationId, organizationId));
    
    return Number(result[0]?.count || 0);
  }

  static async getTransactionCount(categoryName: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.category, categoryName));
    
    return Number(result[0]?.count || 0);
  }

  static async getTransactionCountByUser(categoryName: string, userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.category, categoryName),
        eq(transactions.userId, userId)
      ));
    
    return Number(result[0]?.count || 0);
  }

  // Get transaction count by organization
  static async getTransactionCountByOrganization(categoryName: string, organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.category, categoryName),
        eq(transactions.organizationId, organizationId)
      ));
    
    return Number(result[0]?.count || 0);
  }
}
