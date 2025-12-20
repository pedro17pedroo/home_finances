import { LoanRepository } from "../repositories/loan.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error.js";
import type { InsertLoan } from "../../core/database/schema.js";

export interface CreateLoanRequest {
  accountId: number;
  amount: number;
  borrower: string;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export interface UpdateLoanRequest {
  amount?: number;
  borrower?: string;
  interestRate?: number;
  dueDate?: string;
  status?: 'pendente' | 'pago' | 'cancelado';
  description?: string;
}

export class LoanService {
  static async createLoan(userId: number, data: CreateLoanRequest) {
    const { accountId, amount, borrower, interestRate, dueDate, description } = data;

    // Verificar se a conta existe e pertence ao usuário
    const account = await AccountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new BadRequestError("Conta não encontrada ou não pertence ao usuário");
    }

    // Verificar se há saldo suficiente
    const currentBalance = parseFloat(account.balance);
    if (currentBalance < amount) {
      throw new BadRequestError("Saldo insuficiente na conta para realizar o empréstimo");
    }

    // Criar o empréstimo
    const loanData: InsertLoan = {
      userId,
      accountId,
      amount: amount.toString(),
      borrower,
      interestRate: interestRate?.toString(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pendente',
      description
    };

    const loan = await LoanRepository.create(loanData);

    // Debitar o valor da conta
    await AccountRepository.updateBalance(accountId, currentBalance - amount);

    return loan;
  }

  static async getLoansByUserId(userId: number) {
    return await LoanRepository.findByUserId(userId);
  }

  static async getLoanById(userId: number, loanId: number) {
    const loan = await LoanRepository.findById(loanId);
    
    if (!loan || loan.userId !== userId) {
      throw new NotFoundError("Empréstimo não encontrado");
    }

    return loan;
  }

  static async updateLoan(userId: number, loanId: number, data: UpdateLoanRequest) {
    const loan = await LoanRepository.findById(loanId);
    
    if (!loan || loan.userId !== userId) {
      throw new NotFoundError("Empréstimo não encontrado");
    }

    // Se está marcando como pago, creditar o valor de volta na conta
    if (data.status === 'pago' && loan.status !== 'pago') {
      const account = await AccountRepository.findById(loan.accountId);
      if (account) {
        const currentBalance = parseFloat(account.balance);
        const loanAmount = parseFloat(loan.amount);
        const interestAmount = loan.interestRate ? 
          (loanAmount * parseFloat(loan.interestRate)) / 100 : 0;
        const totalAmount = loanAmount + interestAmount;
        
        await AccountRepository.updateBalance(loan.accountId, currentBalance + totalAmount);
      }
    }

    const updateData: Partial<InsertLoan> = {};
    
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.borrower !== undefined) updateData.borrower = data.borrower;
    if (data.interestRate !== undefined) updateData.interestRate = data.interestRate.toString();
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description;

    return await LoanRepository.update(loanId, updateData);
  }

  static async deleteLoan(userId: number, loanId: number) {
    const loan = await LoanRepository.findById(loanId);
    
    if (!loan || loan.userId !== userId) {
      throw new NotFoundError("Empréstimo não encontrado");
    }

    // Se o empréstimo está pendente, devolver o valor para a conta
    if (loan.status === 'pendente') {
      const account = await AccountRepository.findById(loan.accountId);
      if (account) {
        const currentBalance = parseFloat(account.balance);
        const loanAmount = parseFloat(loan.amount);
        await AccountRepository.updateBalance(loan.accountId, currentBalance + loanAmount);
      }
    }

    return await LoanRepository.delete(loanId);
  }

  static async getLoansSummary(userId: number) {
    return await LoanRepository.getSummaryByUserId(userId);
  }

  static async getOverdueLoans(userId: number) {
    const loans = await LoanRepository.findByUserIdAndStatus(userId, 'pendente');
    const today = new Date();
    
    return loans.filter(loan => 
      loan.dueDate && new Date(loan.dueDate) < today
    );
  }
}