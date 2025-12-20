import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { LoanRepository } from "../repositories/loan.repository.js";
import { DebtRepository } from "../repositories/debt.repository.js";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository.js";
import { TransferRepository } from "../repositories/transfer.repository.js";
import { logger } from "../../core/utils/logger.js";

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeAccounts?: boolean;
  includeTransactions?: boolean;
  includeLoans?: boolean;
  includeDebts?: boolean;
  includeSavingsGoals?: boolean;
  includeTransfers?: boolean;
}

export interface ExportResult {
  filename: string;
  data: string | Buffer;
  mimeType: string;
  size: number;
}

export class ExportService {
  /**
   * Exporta dados financeiros do usuário
   */
  static async exportUserData(userId: number, options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info(`Iniciando exportação para usuário ${userId} no formato ${options.format}`);

      const data = await this.gatherUserData(userId, options);
      
      switch (options.format) {
        case 'json':
          return this.exportAsJSON(data, userId);
        case 'csv':
          return this.exportAsCSV(data, userId);
        case 'xlsx':
          return this.exportAsXLSX(data, userId);
        default:
          throw new Error(`Formato não suportado: ${options.format}`);
      }
    } catch (error) {
      logger.error(`Erro na exportação para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Cria backup completo dos dados do usuário
   */
  static async createFullBackup(userId: number): Promise<ExportResult> {
    const options: ExportOptions = {
      format: 'json',
      includeAccounts: true,
      includeTransactions: true,
      includeLoans: true,
      includeDebts: true,
      includeSavingsGoals: true,
      includeTransfers: true
    };

    const result = await this.exportUserData(userId, options);
    
    // Adicionar metadados do backup
    const backupData = JSON.parse(result.data as string);
    backupData.backup_metadata = {
      created_at: new Date().toISOString(),
      user_id: userId,
      version: '1.0',
      type: 'full_backup'
    };

    const finalData = JSON.stringify(backupData, null, 2);
    
    return {
      filename: `financecontrol_backup_${userId}_${new Date().toISOString().split('T')[0]}.json`,
      data: finalData,
      mimeType: 'application/json',
      size: Buffer.byteLength(finalData, 'utf8')
    };
  }

  /**
   * Exporta relatório de transações em CSV
   */
  static async exportTransactionsCSV(userId: number, startDate?: Date, endDate?: Date): Promise<ExportResult> {
    const transactions = await TransactionRepository.findByUserId(userId, {
      startDate,
      endDate
    });

    const csvHeaders = [
      'Data',
      'Descrição',
      'Categoria',
      'Tipo',
      'Valor',
      'Conta',
      'Recorrente',
      'Frequência'
    ];

    const csvRows = transactions.map(transaction => [
      new Date(transaction.date).toLocaleDateString('pt-BR'),
      transaction.description || '',
      transaction.category,
      transaction.type,
      transaction.amount,
      transaction.accountId?.toString() || '',
      transaction.isRecurring ? 'Sim' : 'Não',
      transaction.recurringFrequency || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const filename = `transacoes_${startDate?.toISOString().split('T')[0] || 'todas'}_${endDate?.toISOString().split('T')[0] || 'ate_hoje'}.csv`;

    return {
      filename,
      data: csvContent,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  /**
   * Coleta todos os dados do usuário
   */
  private static async gatherUserData(userId: number, options: ExportOptions) {
    const data: any = {
      user_id: userId,
      export_date: new Date().toISOString(),
      export_options: options
    };

    const promises: Promise<any>[] = [];

    if (options.includeAccounts) {
      promises.push(
        AccountRepository.findByUserId(userId).then(accounts => {
          data.accounts = accounts;
        })
      );
    }

    if (options.includeTransactions) {
      promises.push(
        TransactionRepository.findByUserId(userId, {
          startDate: options.dateRange?.startDate,
          endDate: options.dateRange?.endDate
        }).then(transactions => {
          data.transactions = transactions;
        })
      );
    }

    if (options.includeLoans) {
      promises.push(
        LoanRepository.findByUserId(userId).then(loans => {
          data.loans = loans;
        })
      );
    }

    if (options.includeDebts) {
      promises.push(
        DebtRepository.findByUserId(userId).then(debts => {
          data.debts = debts;
        })
      );
    }

    if (options.includeSavingsGoals) {
      promises.push(
        SavingsGoalRepository.findByUserId(userId).then(goals => {
          data.savings_goals = goals;
        })
      );
    }

    if (options.includeTransfers) {
      promises.push(
        TransferRepository.findByUserId(userId).then(transfers => {
          data.transfers = transfers;
        })
      );
    }

    await Promise.all(promises);
    return data;
  }

  /**
   * Exporta como JSON
   */
  private static exportAsJSON(data: any, userId: number): ExportResult {
    const jsonData = JSON.stringify(data, null, 2);
    const filename = `financecontrol_export_${userId}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      filename,
      data: jsonData,
      mimeType: 'application/json',
      size: Buffer.byteLength(jsonData, 'utf8')
    };
  }

  /**
   * Exporta como CSV (apenas transações)
   */
  private static exportAsCSV(data: any, userId: number): ExportResult {
    if (!data.transactions) {
      throw new Error('Dados de transações são necessários para exportação CSV');
    }

    const csvHeaders = [
      'Data',
      'Descrição',
      'Categoria',
      'Tipo',
      'Valor',
      'Conta ID',
      'Recorrente',
      'Frequência'
    ];

    const csvRows = data.transactions.map((transaction: any) => [
      new Date(transaction.date).toLocaleDateString('pt-BR'),
      transaction.description || '',
      transaction.category,
      transaction.type,
      transaction.amount,
      transaction.accountId?.toString() || '',
      transaction.isRecurring ? 'Sim' : 'Não',
      transaction.recurringFrequency || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const filename = `financecontrol_transactions_${userId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      filename,
      data: csvContent,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  /**
   * Exporta como XLSX (placeholder - requer biblioteca adicional)
   */
  private static exportAsXLSX(data: any, userId: number): ExportResult {
    // Para implementação completa, seria necessário instalar uma biblioteca como 'xlsx'
    // Por agora, retornamos JSON com extensão xlsx
    const jsonData = JSON.stringify(data, null, 2);
    const filename = `financecontrol_export_${userId}_${new Date().toISOString().split('T')[0]}.xlsx`;

    logger.warn('Exportação XLSX não implementada completamente, retornando JSON');

    return {
      filename,
      data: jsonData,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: Buffer.byteLength(jsonData, 'utf8')
    };
  }

  /**
   * Gera relatório de resumo financeiro
   */
  static async generateFinancialSummaryReport(userId: number): Promise<ExportResult> {
    const [accounts, transactions, loans, debts, savingsGoals] = await Promise.all([
      AccountRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId),
      LoanRepository.findByUserId(userId),
      DebtRepository.findByUserId(userId),
      SavingsGoalRepository.findByUserId(userId)
    ]);

    const summary = {
      generated_at: new Date().toISOString(),
      user_id: userId,
      summary: {
        total_accounts: accounts.length,
        total_balance: accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0),
        total_transactions: transactions.length,
        total_income: transactions
          .filter(t => t.type === 'receita')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        total_expenses: transactions
          .filter(t => t.type === 'despesa')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        total_loans: loans.length,
        total_loan_amount: loans
          .filter(l => l.status === 'pendente')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0),
        total_debts: debts.length,
        total_debt_amount: debts
          .filter(d => d.status === 'pendente')
          .reduce((sum, d) => sum + parseFloat(d.amount), 0),
        total_savings_goals: savingsGoals.length,
        total_savings_target: savingsGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0),
        total_savings_current: savingsGoals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0)
      }
    };

    const jsonData = JSON.stringify(summary, null, 2);
    const filename = `financial_summary_${userId}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      filename,
      data: jsonData,
      mimeType: 'application/json',
      size: Buffer.byteLength(jsonData, 'utf8')
    };
  }
}