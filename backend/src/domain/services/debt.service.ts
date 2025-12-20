import { DebtRepository } from "../repositories/debt.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error.js";
import type { InsertDebt } from "../../core/database/schema.js";

export interface CreateDebtRequest {
  accountId: number;
  amount: number;
  creditor: string;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export interface UpdateDebtRequest {
  amount?: number;
  creditor?: string;
  interestRate?: number;
  dueDate?: string;
  status?: 'pendente' | 'pago' | 'cancelado';
  description?: string;
}

export class DebtService {
  static async createDebt(userId: number, data: CreateDebtRequest) {
    const { accountId, amount, creditor, interestRate, dueDate, description } = data;

    // Verificar se a conta existe e pertence ao usuário
    const account = await AccountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new BadRequestError("Conta não encontrada ou não pertence ao usuário");
    }

    // Criar a dívida
    const debtData: InsertDebt = {
      userId,
      accountId,
      amount: amount.toString(),
      creditor,
      interestRate: interestRate?.toString(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pendente',
      description
    };

    const debt = await DebtRepository.create(debtData);

    // Creditar o valor na conta (recebemos o dinheiro emprestado)
    const currentBalance = parseFloat(account.balance);
    await AccountRepository.updateBalance(accountId, currentBalance + amount);

    return debt;
  }

  static async getDebtsByUserId(userId: number) {
    return await DebtRepository.findByUserId(userId);
  }

  static async getDebtById(userId: number, debtId: number) {
    const debt = await DebtRepository.findById(debtId);
    
    if (!debt || debt.userId !== userId) {
      throw new NotFoundError("Dívida não encontrada");
    }

    return debt;
  }

  static async updateDebt(userId: number, debtId: number, data: UpdateDebtRequest) {
    const debt = await DebtRepository.findById(debtId);
    
    if (!debt || debt.userId !== userId) {
      throw new NotFoundError("Dívida não encontrada");
    }

    // Se está marcando como pago, debitar o valor da conta
    if (data.status === 'pago' && debt.status !== 'pago') {
      const account = await AccountRepository.findById(debt.accountId);
      if (account) {
        const currentBalance = parseFloat(account.balance);
        const debtAmount = parseFloat(debt.amount);
        const interestAmount = debt.interestRate ? 
          (debtAmount * parseFloat(debt.interestRate)) / 100 : 0;
        const totalAmount = debtAmount + interestAmount;
        
        if (currentBalance < totalAmount) {
          throw new BadRequestError("Saldo insuficiente para quitar a dívida");
        }
        
        await AccountRepository.updateBalance(debt.accountId, currentBalance - totalAmount);
      }
    }

    const updateData: Partial<InsertDebt> = {};
    
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.creditor !== undefined) updateData.creditor = data.creditor;
    if (data.interestRate !== undefined) updateData.interestRate = data.interestRate.toString();
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description;

    return await DebtRepository.update(debtId, updateData);
  }

  static async deleteDebt(userId: number, debtId: number) {
    const debt = await DebtRepository.findById(debtId);
    
    if (!debt || debt.userId !== userId) {
      throw new NotFoundError("Dívida não encontrada");
    }

    // Se a dívida está pendente, remover o valor da conta
    if (debt.status === 'pendente') {
      const account = await AccountRepository.findById(debt.accountId);
      if (account) {
        const currentBalance = parseFloat(account.balance);
        const debtAmount = parseFloat(debt.amount);
        await AccountRepository.updateBalance(debt.accountId, currentBalance - debtAmount);
      }
    }

    return await DebtRepository.delete(debtId);
  }

  static async getDebtsSummary(userId: number) {
    return await DebtRepository.getSummaryByUserId(userId);
  }

  static async getOverdueDebts(userId: number) {
    const debts = await DebtRepository.findByUserIdAndStatus(userId, 'pendente');
    const today = new Date();
    
    return debts.filter(debt => 
      debt.dueDate && new Date(debt.dueDate) < today
    );
  }
}