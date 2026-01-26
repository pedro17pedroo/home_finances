import { DebtRepository } from "../repositories/debt.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../core/errors/app-error.js";
import type { InsertDebt, InsertTransaction } from "../../core/database/schema.js";

export interface CreateDebtRequest {
  accountId: number;
  amount: number;
  creditor: string;
  creditorPhone?: string;
  creditorEmail?: string;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export interface MakePaymentRequest {
  amount: number;
  description?: string;
}

export interface CancelDebtRequest {
  reason: string;
}

export class DebtService {
  static async createDebt(userId: number, data: CreateDebtRequest, organizationId?: number | null) {
    const { accountId, amount, creditor, creditorPhone, creditorEmail, interestRate, dueDate, description } = data;

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

    // Criar a dívida
    const debtData: InsertDebt = {
      userId,
      organizationId: organizationId || undefined,
      accountId,
      amount: amount.toString(),
      paidAmount: '0',
      creditor,
      creditorPhone,
      creditorEmail,
      interestRate: interestRate?.toString(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pendente',
      description
    };

    const debt = await DebtRepository.create(debtData);

    // Creditar o valor na conta (recebemos o dinheiro emprestado)
    const currentBalance = parseFloat(account.balance);
    await AccountRepository.updateBalance(accountId, currentBalance + amount);

    // Criar transação de entrada (receita) - dinheiro que recebemos emprestado
    const transactionData: InsertTransaction = {
      userId,
      organizationId: organizationId || undefined,
      accountId,
      amount: amount.toString(),
      type: 'receita',
      category: 'Dívida Contraída',
      description: `Dívida com ${creditor}${description ? ` - ${description}` : ''}`,
      date: new Date(),
    };
    await TransactionRepository.create(transactionData);

    return debt;
  }

  static async getDebts(organizationId: number | null, userId: number) {
    return await DebtRepository.findByOrganizationOrUser(organizationId, userId);
  }

  static async getDebtById(userId: number, debtId: number, organizationId?: number | null) {
    const debt = await DebtRepository.findById(debtId);
    
    if (!debt) {
      throw new NotFoundError("Dívida não encontrada");
    }

    if (organizationId) {
      if (debt.organizationId !== organizationId) {
        throw new ForbiddenError("Dívida não pertence à organização");
      }
    } else if (debt.userId !== userId) {
      throw new ForbiddenError("Dívida não pertence ao usuário");
    }

    return debt;
  }

  // Registar pagamento parcial ou total
  static async makePayment(userId: number, debtId: number, data: MakePaymentRequest, organizationId?: number | null) {
    const debt = await this.getDebtById(userId, debtId, organizationId);

    if (debt.status !== 'pendente') {
      throw new BadRequestError("Esta dívida já foi paga ou cancelada");
    }

    const totalAmount = parseFloat(debt.amount);
    const currentPaid = parseFloat(debt.paidAmount || '0');
    const remainingAmount = totalAmount - currentPaid;

    if (data.amount <= 0) {
      throw new BadRequestError("O valor do pagamento deve ser maior que zero");
    }

    if (data.amount > remainingAmount) {
      throw new BadRequestError(`O valor máximo que pode ser pago é ${remainingAmount.toFixed(2)} Kz`);
    }

    // Verificar saldo na conta
    const account = await AccountRepository.findById(debt.accountId);
    if (!account) {
      throw new BadRequestError("Conta não encontrada");
    }

    const currentBalance = parseFloat(account.balance);
    if (currentBalance < data.amount) {
      throw new BadRequestError("Saldo insuficiente na conta para realizar o pagamento");
    }

    const newPaidAmount = currentPaid + data.amount;
    const isFullyPaid = newPaidAmount >= totalAmount;

    // Atualizar a dívida
    const updateData: Partial<InsertDebt> = {
      paidAmount: newPaidAmount.toString(),
      status: isFullyPaid ? 'pago' : 'pendente'
    };

    const updatedDebt = await DebtRepository.update(debtId, updateData);

    // Debitar o valor da conta
    await AccountRepository.updateBalance(debt.accountId, currentBalance - data.amount);

    // Se pagamento completo, criar transação de despesa
    if (isFullyPaid) {
      const interestAmount = debt.interestRate 
        ? (totalAmount * parseFloat(debt.interestRate)) / 100 
        : 0;
      
      // Se há juros, debitar também
      if (interestAmount > 0) {
        const newBalance = parseFloat(account.balance) - data.amount;
        if (newBalance < interestAmount) {
          throw new BadRequestError("Saldo insuficiente para pagar os juros");
        }
        await AccountRepository.updateBalance(debt.accountId, newBalance - interestAmount);
      }

      const transactionData: InsertTransaction = {
        userId,
        organizationId: organizationId || undefined,
        accountId: debt.accountId,
        amount: (totalAmount + interestAmount).toString(),
        type: 'despesa',
        category: 'Dívida Paga',
        description: `Pagamento de dívida a ${debt.creditor}${interestAmount > 0 ? ` (inclui ${interestAmount.toFixed(2)} Kz de juros)` : ''}`,
        date: new Date(),
      };
      await TransactionRepository.create(transactionData);
    }

    return updatedDebt;
  }

  // Cancelar dívida
  static async cancelDebt(userId: number, debtId: number, data: CancelDebtRequest, organizationId?: number | null) {
    const debt = await this.getDebtById(userId, debtId, organizationId);

    if (debt.status !== 'pendente') {
      throw new BadRequestError("Esta dívida já foi paga ou cancelada");
    }

    if (!data.reason || data.reason.trim().length < 3) {
      throw new BadRequestError("É necessário informar o motivo do cancelamento");
    }

    const paidAmount = parseFloat(debt.paidAmount || '0');
    
    // Se já houve pagamentos parciais, não pode cancelar
    if (paidAmount > 0) {
      throw new BadRequestError("Não é possível cancelar uma dívida que já recebeu pagamentos parciais");
    }

    // Remover o valor da conta (devolver o dinheiro que recebemos)
    const account = await AccountRepository.findById(debt.accountId);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      const debtAmount = parseFloat(debt.amount);
      
      if (currentBalance < debtAmount) {
        throw new BadRequestError("Saldo insuficiente para cancelar a dívida. O valor recebido precisa ser devolvido.");
      }
      
      await AccountRepository.updateBalance(debt.accountId, currentBalance - debtAmount);
    }

    // Atualizar status para cancelado
    const updateData: Partial<InsertDebt> = {
      status: 'cancelado',
      cancelReason: data.reason
    };

    return await DebtRepository.update(debtId, updateData);
  }

  static async getDebtsSummary(userId: number, organizationId?: number | null) {
    return await DebtRepository.getSummaryByOrganizationOrUser(organizationId || null, userId);
  }

  static async getOverdueDebts(userId: number, organizationId?: number | null) {
    let debts;
    
    if (organizationId) {
      debts = await DebtRepository.findByOrganizationIdAndStatus(organizationId, 'pendente');
    } else {
      debts = await DebtRepository.findByUserIdAndStatus(userId, 'pendente');
    }
    
    const today = new Date();
    
    return debts.filter(debt => 
      debt.dueDate && new Date(debt.dueDate) < today
    );
  }
}
