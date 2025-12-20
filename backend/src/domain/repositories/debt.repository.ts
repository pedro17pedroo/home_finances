import { eq, and, desc } from "drizzle-orm";
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

  static async findByUserIdAndStatus(userId: number, status: string): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.status, status)))
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
    return result.rowCount > 0;
  }

  static async getSummaryByUserId(userId: number) {
    const userDebts = await this.findByUserId(userId);
    
    const totalDebts = userDebts.length;
    const totalAmount = userDebts.reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
    const pendingDebts = userDebts.filter(debt => debt.status === 'pendente').length;
    const paidDebts = userDebts.filter(debt => debt.status === 'pago').length;
    const overdueDebts = userDebts.filter(debt => 
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
      pendingAmount: userDebts
        .filter(debt => debt.status === 'pendente')
        .reduce((sum, debt) => sum + parseFloat(debt.amount), 0),
      paidAmount: userDebts
        .filter(debt => debt.status === 'pago')
        .reduce((sum, debt) => sum + parseFloat(debt.amount), 0)
    };
  }
}