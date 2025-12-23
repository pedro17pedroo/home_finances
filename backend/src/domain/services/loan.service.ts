import { LoanRepository } from "../repositories/loan.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../core/errors/app-error.js";
import type { InsertLoan, InsertTransaction } from "../../core/database/schema.js";

export interface CreateLoanRequest {
  accountId: number;
  amount: number;
  borrower: string;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export interface MakePaymentRequest {
  amount: number;
  description?: string;
}

export interface CancelLoanRequest {
  reason: string;
}

export class LoanService {
  static async createLoan(userId: number, data: CreateLoanRequest, organizationId?: number | null) {
    const { accountId, amount, borrower, interestRate, dueDate, description } = data;

    // Verificar se a conta existe e pertence ao usuário/organização
    const account = await AccountRepository.findById(accountId);
    if (!account) {
      throw new BadRequestError("Conta não encontrada");
    }
    
    if (organizationId) {
      if (account.organizationId !== organizationId) {
        throw new ForbiddenError("Conta não pertence à organização");
      }
    } else if (account.userId !== userId) {
      throw new ForbiddenError("Conta não pertence ao usuário");
    }

    // Verificar se há saldo suficiente
    const currentBalance = parseFloat(account.balance);
    if (currentBalance < amount) {
      throw new BadRequestError("Saldo insuficiente na conta para realizar o empréstimo");
    }

    // Criar o empréstimo
    const loanData: InsertLoan = {
      userId,
      organizationId: organizationId || undefined,
      accountId,
      amount: amount.toString(),
      paidAmount: '0',
      borrower,
      interestRate: interestRate?.toString(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pendente',
      description
    };

    const loan = await LoanRepository.create(loanData);

    // Debitar o valor da conta
    await AccountRepository.updateBalance(accountId, currentBalance - amount);

    // Criar transação de saída (despesa) - dinheiro que saiu para emprestar
    const transactionData: InsertTransaction = {
      userId,
      organizationId: organizationId || undefined,
      accountId,
      amount: amount.toString(),
      type: 'despesa',
      category: 'Empréstimo Dado',
      description: `Empréstimo para ${borrower}${description ? ` - ${description}` : ''}`,
      date: new Date(),
    };
    await TransactionRepository.create(transactionData);

    return loan;
  }

  static async getLoans(organizationId: number | null, userId: number) {
    return await LoanRepository.findByOrganizationOrUser(organizationId, userId);
  }

  static async getLoanById(userId: number, loanId: number, organizationId?: number | null) {
    const loan = await LoanRepository.findById(loanId);
    
    if (!loan) {
      throw new NotFoundError("Empréstimo não encontrado");
    }

    if (organizationId) {
      if (loan.organizationId !== organizationId) {
        throw new ForbiddenError("Empréstimo não pertence à organização");
      }
    } else if (loan.userId !== userId) {
      throw new ForbiddenError("Empréstimo não pertence ao usuário");
    }

    return loan;
  }

  // Registar pagamento parcial ou total
  static async makePayment(userId: number, loanId: number, data: MakePaymentRequest, organizationId?: number | null) {
    const loan = await this.getLoanById(userId, loanId, organizationId);

    if (loan.status !== 'pendente') {
      throw new BadRequestError("Este empréstimo já foi pago ou cancelado");
    }

    const totalAmount = parseFloat(loan.amount);
    const currentPaid = parseFloat(loan.paidAmount || '0');
    const remainingAmount = totalAmount - currentPaid;

    if (data.amount <= 0) {
      throw new BadRequestError("O valor do pagamento deve ser maior que zero");
    }

    if (data.amount > remainingAmount) {
      throw new BadRequestError(`O valor máximo que pode ser pago é ${remainingAmount.toFixed(2)} Kz`);
    }

    const newPaidAmount = currentPaid + data.amount;
    const isFullyPaid = newPaidAmount >= totalAmount;

    // Atualizar o empréstimo
    const updateData: Partial<InsertLoan> = {
      paidAmount: newPaidAmount.toString(),
      status: isFullyPaid ? 'pago' : 'pendente'
    };

    const updatedLoan = await LoanRepository.update(loanId, updateData);

    // Creditar o valor na conta
    const account = await AccountRepository.findById(loan.accountId);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      await AccountRepository.updateBalance(loan.accountId, currentBalance + data.amount);
    }

    // Se pagamento completo, criar transação de receita
    if (isFullyPaid) {
      const interestAmount = loan.interestRate 
        ? (totalAmount * parseFloat(loan.interestRate)) / 100 
        : 0;
      
      // Se há juros, creditar também
      if (interestAmount > 0 && account) {
        const currentBalance = parseFloat(account.balance);
        await AccountRepository.updateBalance(loan.accountId, currentBalance + interestAmount);
      }

      const transactionData: InsertTransaction = {
        userId,
        organizationId: organizationId || undefined,
        accountId: loan.accountId,
        amount: (totalAmount + interestAmount).toString(),
        type: 'receita',
        category: 'Empréstimo Recebido',
        description: `Pagamento de empréstimo de ${loan.borrower}${interestAmount > 0 ? ` (inclui ${interestAmount.toFixed(2)} Kz de juros)` : ''}`,
        date: new Date(),
      };
      await TransactionRepository.create(transactionData);
    }

    return updatedLoan;
  }

  // Cancelar empréstimo
  static async cancelLoan(userId: number, loanId: number, data: CancelLoanRequest, organizationId?: number | null) {
    const loan = await this.getLoanById(userId, loanId, organizationId);

    if (loan.status !== 'pendente') {
      throw new BadRequestError("Este empréstimo já foi pago ou cancelado");
    }

    if (!data.reason || data.reason.trim().length < 3) {
      throw new BadRequestError("É necessário informar o motivo do cancelamento");
    }

    const paidAmount = parseFloat(loan.paidAmount || '0');
    
    // Se já houve pagamentos parciais, não pode cancelar
    if (paidAmount > 0) {
      throw new BadRequestError("Não é possível cancelar um empréstimo que já recebeu pagamentos parciais");
    }

    // Devolver o valor para a conta
    const account = await AccountRepository.findById(loan.accountId);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      const loanAmount = parseFloat(loan.amount);
      await AccountRepository.updateBalance(loan.accountId, currentBalance + loanAmount);
    }

    // Atualizar status para cancelado
    const updateData: Partial<InsertLoan> = {
      status: 'cancelado',
      cancelReason: data.reason
    };

    return await LoanRepository.update(loanId, updateData);
  }

  static async getLoansSummary(userId: number, organizationId?: number | null) {
    return await LoanRepository.getSummaryByOrganizationOrUser(organizationId || null, userId);
  }

  static async getOverdueLoans(userId: number, organizationId?: number | null) {
    let loans;
    
    if (organizationId) {
      loans = await LoanRepository.findByOrganizationIdAndStatus(organizationId, 'pendente');
    } else {
      loans = await LoanRepository.findByUserIdAndStatus(userId, 'pendente');
    }
    
    const today = new Date();
    
    return loans.filter(loan => 
      loan.dueDate && new Date(loan.dueDate) < today
    );
  }
}
