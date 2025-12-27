import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { debts, type Debt, type InsertDebt } from "../../core/database/schema.js";

export class DebtRepository {
  static async create(data: InsertDebt): Promise<Debt> {
    const [debt] = await db.insert(debts).values(data).returning();
    return debt;
  }

  static async findById(id: number): Promise<Debt | null> {
    const [debt] = await db.select().from(debts).where(eq(debts.id, id));
    return debt || null;
  }

  static async findByUserId(userId: number): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(eq(debts.userId, userId))
      .orderBy(desc(debts.createdAt));
  }

  // Find by organization ID (multi-tenant)
  static async findByOrganizationId(organizationId: number): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(eq(debts.organizationId, organizationId))
      .orderBy(desc(debts.createdAt));
  }

  // Find by organization or user (for migration period)
  static async findByOrganizationOrUser(organizationId: number | null, userId: number): Promise<Debt[]> {
    if (organizationId) {
      return this.findByOrganizationId(organizationId);
    }
    return this.findByUserId(userId);
  }

  static async findByUserIdAndStatus(userId: number, status: 'pendente' | 'pago' | 'cancelado'): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.status, status)))
      .orderBy(desc(debts.createdAt));
  }

  // Find by organization and status
  static async findByOrganizationIdAndStatus(organizationId: number, status: 'pendente' | 'pago' | 'cancelado'): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(and(eq(debts.organizationId, organizationId), eq(debts.status, status)))
      .orderBy(desc(debts.createdAt));
  }

  static async update(id: number, data: Partial<InsertDebt>): Promise<Debt | null> {
    const [debt] = await db
      .update(debts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(debts.id, id))
      .returning();
    return debt || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await db.delete(debts).where(eq(debts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Count by user
  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(debts)
      .where(eq(debts.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  // Count by organization
  static async countByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(debts)
      .where(eq(debts.organizationId, organizationId));
    
    return Number(result[0]?.count || 0);
  }

  static async getSummaryByUserId(userId: number) {
    const userDebts = await this.findByUserId(userId);
    return this.calculateSummary(userDebts);
  }

  // Get summary by organization
  static async getSummaryByOrganizationId(organizationId: number) {
    const orgDebts = await this.findByOrganizationId(organizationId);
    return this.calculateSummary(orgDebts);
  }

  // Get summary by organization or user
  static async getSummaryByOrganizationOrUser(organizationId: number | null, userId: number) {
    if (organizationId) {
      return this.getSummaryByOrganizationId(organizationId);
    }
    return this.getSummaryByUserId(userId);
  }

  private static calculateSummary(debtsList: Debt[]) {
    const totalDebts = debtsList.length;
    const totalAmount = debtsList.reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
    const pendingDebts = debtsList.filter(debt => debt.status === 'pendente').length;
    const paidDebts = debtsList.filter(debt => debt.status === 'pago').length;
    const overdueDebts = debtsList.filter(debt => 
      debt.status === 'pendente' && 
      debt.dueDate && 
      new Date(debt.dueDate) < new Date()
    ).length;

    return {
      totalDebts,
      totalAmount,
      pendingDebts,
      paidDebts,
      overdueDebts,
      pendingAmount: debtsList
        .filter(debt => debt.status === 'pendente')
        .reduce((sum, debt) => sum + parseFloat(debt.amount), 0),
      paidAmount: debtsList
        .filter(debt => debt.status === 'pago')
        .reduce((sum, debt) => sum + parseFloat(debt.amount), 0)
    };
  }
}