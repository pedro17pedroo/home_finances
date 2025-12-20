import { eq, and, desc } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { loans, type Loan, type InsertLoan } from "../../core/database/schema.js";

export class LoanRepository {
  static async create(data: InsertLoan): Promise<Loan> {
    const [loan] = await db.insert(loans).values(data).returning();
    return loan;
  }

  static async findById(id: number): Promise<Loan | null> {
    const [loan] = await db.select().from(loans).where(eq(loans.id, id));
    return loan || null;
  }

  static async findByUserId(userId: number): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.createdAt));
  }

  static async findByUserIdAndStatus(userId: number, status: string): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.status, status)))
      .orderBy(desc(loans.createdAt));
  }

  static async update(id: number, data: Partial<InsertLoan>): Promise<Loan | null> {
    const [loan] = await db
      .update(loans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(loans.id, id))
      .returning();
    return loan || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await db.delete(loans).where(eq(loans.id, id));
    return result.rowCount > 0;
  }

  static async getSummaryByUserId(userId: number) {
    const userLoans = await this.findByUserId(userId);
    
    const totalLoans = userLoans.length;
    const totalAmount = userLoans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
    const pendingLoans = userLoans.filter(loan => loan.status === 'pendente').length;
    const paidLoans = userLoans.filter(loan => loan.status === 'pago').length;
    const overdueLoans = userLoans.filter(loan => 
      loan.status === 'pendente' && 
      loan.dueDate && 
      new Date(loan.dueDate) < new Date()
    ).length;

    return {
      totalLoans,
      totalAmount,
      pendingLoans,
      paidLoans,
      overdueLoans,
      pendingAmount: userLoans
        .filter(loan => loan.status === 'pendente')
        .reduce((sum, loan) => sum + parseFloat(loan.amount), 0),
      paidAmount: userLoans
        .filter(loan => loan.status === 'pago')
        .reduce((sum, loan) => sum + parseFloat(loan.amount), 0)
    };
  }
}