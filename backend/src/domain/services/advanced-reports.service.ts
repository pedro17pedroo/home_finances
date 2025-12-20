import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { LoanRepository } from "../repositories/loan.repository.js";
import { DebtRepository } from "../repositories/debt.repository.js";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository.js";
import { logger } from "../../core/utils/logger.js";

export interface FinancialOverview {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  savingsRate: number;
  monthlyTrend: MonthlyData[];
  categoryBreakdown: CategoryData[];
  accountDistribution: AccountData[];
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AccountData {
  accountName: string;
  accountType: string;
  balance: number;
  percentage: number;
}

export interface CashFlowAnalysis {
  monthlyIncome: number;
  monthlyExpenses: number;
  averageMonthlyBalance: number;
  projectedBalance: number;
  burnRate: number;
  runwayMonths: number;
}

export interface DebtAnalysis {
  totalDebt: number;
  totalLoans: number;
  netDebtPosition: number;
  debtToIncomeRatio: number;
  averageInterestRate: number;
  monthlyDebtPayments: number;
}

export class AdvancedReportsService {
  /**
   * Gera relatório financeiro completo
   */
  static async getFinancialOverview(userId: number, months: number = 12): Promise<FinancialOverview> {
    try {
      logger.info(`Gerando relatório financeiro para usuário ${userId}`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Buscar dados básicos
      const [accounts, transactions, loans, debts, savingsGoals] = await Promise.all([
        AccountRepository.findByUserId(userId),
        TransactionRepository.findByUserId(userId, { startDate, endDate }),
        LoanRepository.findByUserId(userId),
        DebtRepository.findByUserId(userId),
        SavingsGoalRepository.findByUserId(userId)
      ]);

      // Calcular métricas principais
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
      const totalIncome = transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalLoansValue = loans
        .filter(l => l.status === 'pendente')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);
      const totalDebtsValue = debts
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + parseFloat(d.amount), 0);

      const netWorth = totalBalance + totalLoansValue - totalDebtsValue;
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      // Gerar dados mensais
      const monthlyTrend = await this.generateMonthlyTrend(userId, months);

      // Breakdown por categoria
      const categoryBreakdown = await this.generateCategoryBreakdown(transactions);

      // Distribuição por conta
      const accountDistribution = this.generateAccountDistribution(accounts);

      return {
        totalBalance,
        totalIncome,
        totalExpenses,
        netWorth,
        savingsRate,
        monthlyTrend,
        categoryBreakdown,
        accountDistribution
      };

    } catch (error) {
      logger.error(`Erro ao gerar relatório financeiro para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Análise de fluxo de caixa
   */
  static async getCashFlowAnalysis(userId: number): Promise<CashFlowAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Últimos 6 meses

    const transactions = await TransactionRepository.findByUserId(userId, { startDate, endDate });
    const accounts = await AccountRepository.findByUserId(userId);

    const monthlyIncome = this.calculateMonthlyAverage(transactions, 'receita', 6);
    const monthlyExpenses = this.calculateMonthlyAverage(transactions, 'despesa', 6);
    const averageMonthlyBalance = monthlyIncome - monthlyExpenses;
    const currentBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    // Projeção para 12 meses
    const projectedBalance = currentBalance + (averageMonthlyBalance * 12);

    // Taxa de queima (burn rate)
    const burnRate = monthlyExpenses;
    const runwayMonths = currentBalance > 0 && monthlyExpenses > monthlyIncome 
      ? currentBalance / (monthlyExpenses - monthlyIncome) 
      : Infinity;

    return {
      monthlyIncome,
      monthlyExpenses,
      averageMonthlyBalance,
      projectedBalance,
      burnRate,
      runwayMonths: runwayMonths === Infinity ? -1 : runwayMonths
    };
  }

  /**
   * Análise de dívidas e empréstimos
   */
  static async getDebtAnalysis(userId: number): Promise<DebtAnalysis> {
    const [loans, debts, transactions] = await Promise.all([
      LoanRepository.findByUserId(userId),
      DebtRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, {
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 12))
      })
    ]);

    const totalLoans = loans
      .filter(l => l.status === 'pendente')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);

    const totalDebt = debts
      .filter(d => d.status === 'pendente')
      .reduce((sum, d) => sum + parseFloat(d.amount), 0);

    const netDebtPosition = totalDebt - totalLoans;

    const monthlyIncome = this.calculateMonthlyAverage(transactions, 'receita', 12);
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;

    // Calcular taxa de juros média
    const loansWithInterest = loans.filter(l => l.interestRate && parseFloat(l.interestRate) > 0);
    const debtsWithInterest = debts.filter(d => d.interestRate && parseFloat(d.interestRate) > 0);
    
    const totalInterestWeighted = [
      ...loansWithInterest.map(l => parseFloat(l.amount) * parseFloat(l.interestRate!)),
      ...debtsWithInterest.map(d => parseFloat(d.amount) * parseFloat(d.interestRate!))
    ].reduce((sum, val) => sum + val, 0);

    const totalAmountWithInterest = [
      ...loansWithInterest.map(l => parseFloat(l.amount)),
      ...debtsWithInterest.map(d => parseFloat(d.amount))
    ].reduce((sum, val) => sum + val, 0);

    const averageInterestRate = totalAmountWithInterest > 0 
      ? totalInterestWeighted / totalAmountWithInterest 
      : 0;

    // Estimar pagamentos mensais de dívidas (assumindo 2% do total por mês)
    const monthlyDebtPayments = totalDebt * 0.02;

    return {
      totalDebt,
      totalLoans,
      netDebtPosition,
      debtToIncomeRatio,
      averageInterestRate,
      monthlyDebtPayments
    };
  }

  /**
   * Comparação entre períodos
   */
  static async getPeriodComparison(userId: number, currentMonths: number = 6, previousMonths: number = 6) {
    const currentEndDate = new Date();
    const currentStartDate = new Date();
    currentStartDate.setMonth(currentStartDate.getMonth() - currentMonths);

    const previousEndDate = new Date(currentStartDate);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setMonth(previousStartDate.getMonth() - previousMonths);

    const [currentTransactions, previousTransactions] = await Promise.all([
      TransactionRepository.findByUserId(userId, { 
        startDate: currentStartDate, 
        endDate: currentEndDate 
      }),
      TransactionRepository.findByUserId(userId, { 
        startDate: previousStartDate, 
        endDate: previousEndDate 
      })
    ]);

    const currentIncome = currentTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const currentExpenses = currentTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const previousIncome = previousTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const previousExpenses = previousTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const incomeGrowth = previousIncome > 0 
      ? ((currentIncome - previousIncome) / previousIncome) * 100 
      : 0;

    const expenseGrowth = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : 0;

    return {
      current: {
        income: currentIncome,
        expenses: currentExpenses,
        balance: currentIncome - currentExpenses
      },
      previous: {
        income: previousIncome,
        expenses: previousExpenses,
        balance: previousIncome - previousExpenses
      },
      growth: {
        income: incomeGrowth,
        expenses: expenseGrowth,
        balance: ((currentIncome - currentExpenses) - (previousIncome - previousExpenses))
      }
    };
  }

  // Métodos auxiliares privados
  private static async generateMonthlyTrend(userId: number, months: number): Promise<MonthlyData[]> {
    const monthlyData: MonthlyData[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - i);
      endDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Último dia do mês

      const startDate = new Date(endDate);
      startDate.setDate(1); // Primeiro dia do mês

      const transactions = await TransactionRepository.findByUserId(userId, { startDate, endDate });
      
      const income = transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const balance = income - expenses;
      const savingsRate = income > 0 ? (balance / income) * 100 : 0;

      monthlyData.push({
        month: startDate.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }),
        income,
        expenses,
        balance,
        savingsRate
      });
    }

    return monthlyData;
  }

  private static async generateCategoryBreakdown(transactions: any[]): Promise<CategoryData[]> {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    transactions.forEach(transaction => {
      const category = transaction.category;
      const amount = parseFloat(transaction.amount);
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category)!;
        existing.amount += amount;
        existing.count += 1;
      } else {
        categoryMap.set(category, { amount, count: 1 });
      }
    });

    const totalAmount = Array.from(categoryMap.values())
      .reduce((sum, cat) => sum + cat.amount, 0);

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        transactionCount: data.count,
        trend: 'stable' as const // TODO: Implementar cálculo de tendência
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private static generateAccountDistribution(accounts: any[]): AccountData[] {
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    return accounts.map(account => ({
      accountName: account.name,
      accountType: account.type,
      balance: parseFloat(account.balance),
      percentage: totalBalance > 0 ? (parseFloat(account.balance) / totalBalance) * 100 : 0
    }));
  }

  private static calculateMonthlyAverage(transactions: any[], type: 'receita' | 'despesa', months: number): number {
    const filteredTransactions = transactions.filter(t => t.type === type);
    const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return total / months;
  }
}