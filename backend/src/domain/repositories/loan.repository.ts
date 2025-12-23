import { eq, and, desc, sql } from "drizzle-orm";
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

  // Find by organization ID (multi-tenant)
  static async findByOrganizationId(organizationId: number): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(eq(loans.organizationId, organizationId))
      .orderBy(desc(loans.createdAt));
  }

  // Find by organization or user (for migration period)
  static async findByOrganizationOrUser(organizationId: number | null, userId: number): Promise<Loan[]> {
    if (organizationId) {
      return this.findByOrganizationId(organizationId);
    }
    return this.findByUserId(userId);
  }

  static async findByUserIdAndStatus(userId: number, status: 'pendente' | 'pago' | 'cancelado'): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.status, status)))
      .orderBy(desc(loans.createdAt));
  }

  // Find by organization and status
  static async findByOrganizationIdAndStatus(organizationId: number, status: 'pendente' | 'pago' | 'cancelado'): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(and(eq(loans.organizationId, organizationId), eq(loans.status, status)))
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

  // Count by user
  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(loans)
      .where(eq(loans.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  // Count by organization
  static async countByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(loans)
      .where(eq(loans.organizationId, organizationId));
    
    return Number(result[0]?.count || 0);
  }

  static async getSummaryByUserId(userId: number) {
    const userLoans = await this.findByUserId(userId);
    return this.calculateSummary(userLoans);
  }

  // Get summary by organization
  static async getSummaryByOrganizationId(organizationId: number) {
    const orgLoans = await this.findByOrganizationId(organizationId);
    return this.calculateSummary(orgLoans);
  }

  // Get summary by organization or user
  static async getSummaryByOrganizationOrUser(organizationId: number | null, userId: number) {
    if (organizationId) {
      return this.getSummaryByOrganizationId(organizationId);
    }
    return this.getSummaryByUserId(userId);
  }

  private static calculateSummary(loansList: Loan[]) {
    const totalLoans = loansList.length;
    const totalAmount = loansList.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
    const pendingLoans = loansList.filter(loan => loan.status === 'pendente').length;
    const paidLoans = loansList.filter(loan => loan.status === 'pago').length;
    const overdueLoans = loansList.filter(loan => 
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
      pendingAmount: loansList
        .filter(loan => loan.status === 'pendente')
        .reduce((sum, loan) => sum + parseFloat(loan.amount), 0),
      paidAmount: loansList
        .filter(loan => loan.status === 'pago')
        .reduce((sum, loan) => sum + parseFloat(loan.amount), 0)
    };
  }
}