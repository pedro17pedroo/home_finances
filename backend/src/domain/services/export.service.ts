import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { LoanRepository } from "../repositories/loan.repository.js";
import { DebtRepository } from "../repositories/debt.repository.js";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository.js";
import { TransferRepository } from "../repositories/transfer.repository.js";
import { logger } from "../../core/utils/logger.js";
import PDFDocument from 'pdfkit';

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
   * Gera relatório de resumo financeiro em texto
   */
  static async generateFinancialSummaryReport(userId: number): Promise<ExportResult> {
    const [accounts, transactions, loans, debts, savingsGoals] = await Promise.all([
      AccountRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId),
      LoanRepository.findByUserId(userId),
      DebtRepository.findByUserId(userId),
      SavingsGoalRepository.findByUserId(userId)
    ]);

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalIncome = transactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalLoanAmount = loans
      .filter(l => l.status === 'pendente')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const totalDebtAmount = debts
      .filter(d => d.status === 'pendente')
      .reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);
    const totalSavingsCurrent = savingsGoals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0);

    const formatCurrency = (value: number) => `${value.toLocaleString('pt-AO')} Kz`;
    const dateStr = new Date().toLocaleDateString('pt-AO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const textReport = `
═══════════════════════════════════════════════════════════════
                    RESUMO FINANCEIRO
                    Finance Control
═══════════════════════════════════════════════════════════════

Data do Relatório: ${dateStr}

───────────────────────────────────────────────────────────────
                         CONTAS
───────────────────────────────────────────────────────────────
Total de Contas: ${accounts.length}
Saldo Total: ${formatCurrency(totalBalance)}

${accounts.map(acc => `  • ${acc.name}: ${formatCurrency(parseFloat(acc.balance))}`).join('\n')}

───────────────────────────────────────────────────────────────
                       TRANSAÇÕES
───────────────────────────────────────────────────────────────
Total de Transações: ${transactions.length}
Total de Receitas: ${formatCurrency(totalIncome)}
Total de Despesas: ${formatCurrency(totalExpenses)}
Balanço: ${formatCurrency(totalIncome - totalExpenses)}

───────────────────────────────────────────────────────────────
                   EMPRÉSTIMOS (A Receber)
───────────────────────────────────────────────────────────────
Total de Empréstimos: ${loans.length}
Valor Pendente: ${formatCurrency(totalLoanAmount)}

───────────────────────────────────────────────────────────────
                    DÍVIDAS (A Pagar)
───────────────────────────────────────────────────────────────
Total de Dívidas: ${debts.length}
Valor Pendente: ${formatCurrency(totalDebtAmount)}

───────────────────────────────────────────────────────────────
                   METAS DE POUPANÇA
───────────────────────────────────────────────────────────────
Total de Metas: ${savingsGoals.length}
Meta Total: ${formatCurrency(totalSavingsTarget)}
Poupado: ${formatCurrency(totalSavingsCurrent)}
Progresso: ${totalSavingsTarget > 0 ? ((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(1) : 0}%

───────────────────────────────────────────────────────────────
                    RESUMO GERAL
───────────────────────────────────────────────────────────────
Patrimônio Líquido: ${formatCurrency(totalBalance + totalLoanAmount - totalDebtAmount)}
  (Saldo + Empréstimos a Receber - Dívidas a Pagar)

═══════════════════════════════════════════════════════════════
          Gerado por Finance Control - ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
`.trim();

    const filename = `resumo_financeiro_${new Date().toISOString().split('T')[0]}.txt`;

    return {
      filename,
      data: textReport,
      mimeType: 'text/plain',
      size: Buffer.byteLength(textReport, 'utf8')
    };
  }

  /**
   * Gera relatório financeiro em PDF
   */
  static async generateFinancialPDFReport(userId: number): Promise<ExportResult> {
    const [accounts, transactions, loans, debts, savingsGoals] = await Promise.all([
      AccountRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId),
      LoanRepository.findByUserId(userId),
      DebtRepository.findByUserId(userId),
      SavingsGoalRepository.findByUserId(userId)
    ]);

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalIncome = transactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalLoanAmount = loans
      .filter(l => l.status === 'pendente')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const totalDebtAmount = debts
      .filter(d => d.status === 'pendente')
      .reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);
    const totalSavingsCurrent = savingsGoals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0);

    const formatCurrency = (value: number) => `${value.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            filename: `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`,
            data: pdfBuffer,
            mimeType: 'application/pdf',
            size: pdfBuffer.length
          });
        });
        doc.on('error', reject);

        // Header - mais compacto
        doc.fontSize(20).fillColor('#2563EB').text('RELATÓRIO FINANCEIRO', { align: 'center' });
        doc.fontSize(10).fillColor('#6B7280').text('Finance Control', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#6B7280').text(
          `Data: ${new Date().toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          { align: 'center' }
        );
        doc.moveDown(1);

        // Summary Cards - mais compactos
        const cardY = doc.y;
        const cardWidth = 120;
        const cardHeight = 60;
        const cardSpacing = 12;

        // Card 1: Saldo Total
        doc.rect(40, cardY, cardWidth, cardHeight).fillAndStroke('#10B981', '#059669');
        doc.fillColor('#FFFFFF').fontSize(9).text('Saldo Total', 45, cardY + 8, { width: cardWidth - 10 });
        doc.fontSize(14).font('Helvetica-Bold').text(formatCurrency(totalBalance), 45, cardY + 24, { width: cardWidth - 10 });
        doc.font('Helvetica').fontSize(7).text(`${accounts.length} conta${accounts.length !== 1 ? 's' : ''}`, 45, cardY + 44, { width: cardWidth - 10 });

        // Card 2: Receitas
        doc.rect(40 + cardWidth + cardSpacing, cardY, cardWidth, cardHeight).fillAndStroke('#10B981', '#059669');
        doc.fillColor('#FFFFFF').fontSize(9).text('Receitas', 45 + cardWidth + cardSpacing, cardY + 8, { width: cardWidth - 10 });
        doc.fontSize(14).font('Helvetica-Bold').text(formatCurrency(totalIncome), 45 + cardWidth + cardSpacing, cardY + 24, { width: cardWidth - 10 });
        doc.font('Helvetica').fontSize(7).text(`${transactions.filter(t => t.type === 'receita').length} transações`, 45 + cardWidth + cardSpacing, cardY + 44, { width: cardWidth - 10 });

        // Card 3: Despesas
        doc.rect(40 + (cardWidth + cardSpacing) * 2, cardY, cardWidth, cardHeight).fillAndStroke('#EF4444', '#DC2626');
        doc.fillColor('#FFFFFF').fontSize(9).text('Despesas', 45 + (cardWidth + cardSpacing) * 2, cardY + 8, { width: cardWidth - 10 });
        doc.fontSize(14).font('Helvetica-Bold').text(formatCurrency(totalExpenses), 45 + (cardWidth + cardSpacing) * 2, cardY + 24, { width: cardWidth - 10 });
        doc.font('Helvetica').fontSize(7).text(`${transactions.filter(t => t.type === 'despesa').length} transações`, 45 + (cardWidth + cardSpacing) * 2, cardY + 44, { width: cardWidth - 10 });

        // Card 4: Balanço
        const balance = totalIncome - totalExpenses;
        doc.rect(40 + (cardWidth + cardSpacing) * 3, cardY, cardWidth, cardHeight).fillAndStroke(balance >= 0 ? '#10B981' : '#EF4444', balance >= 0 ? '#059669' : '#DC2626');
        doc.fillColor('#FFFFFF').fontSize(9).text('Balanço', 45 + (cardWidth + cardSpacing) * 3, cardY + 8, { width: cardWidth - 10 });
        doc.fontSize(14).font('Helvetica-Bold').text(formatCurrency(balance), 45 + (cardWidth + cardSpacing) * 3, cardY + 24, { width: cardWidth - 10 });
        doc.font('Helvetica').fontSize(7).text(balance >= 0 ? 'Positivo' : 'Negativo', 45 + (cardWidth + cardSpacing) * 3, cardY + 44, { width: cardWidth - 10 });

        doc.y = cardY + cardHeight + 20;

        // Contas Section - mais compacto
        doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('CONTAS BANCÁRIAS');
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#6B7280').font('Helvetica').text(`Total de ${accounts.length} conta${accounts.length !== 1 ? 's' : ''}`);
        doc.moveDown(0.5);

        if (accounts.length > 0) {
          accounts.forEach((acc, index) => {
            const accBalance = parseFloat(acc.balance);
            doc.fontSize(9).fillColor('#374151').text(`• ${acc.name} (${acc.bank || 'Banco'}):`, { continued: true });
            doc.fillColor(accBalance >= 0 ? '#059669' : '#DC2626').text(` ${formatCurrency(accBalance)}`);
          });
        } else {
          doc.fontSize(9).fillColor('#9CA3AF').text('Nenhuma conta registrada');
        }
        doc.moveDown(1.2);

        // Empréstimos e Dívidas - mais compacto
        doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('EMPRÉSTIMOS E DÍVIDAS');
        doc.moveDown(0.3);

        doc.fontSize(10).fillColor('#F59E0B').font('Helvetica-Bold').text('Dinheiro Emprestado (A Receber)');
        doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Total: ${formatCurrency(totalLoanAmount)} • ${loans.filter(l => l.status === 'pendente').length} empréstimo${loans.filter(l => l.status === 'pendente').length !== 1 ? 's' : ''} pendente${loans.filter(l => l.status === 'pendente').length !== 1 ? 's' : ''}`);
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#EF4444').font('Helvetica-Bold').text('Dívidas (A Pagar)');
        doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Total: ${formatCurrency(totalDebtAmount)} • ${debts.filter(d => d.status === 'pendente').length} dívida${debts.filter(d => d.status === 'pendente').length !== 1 ? 's' : ''} pendente${debts.filter(d => d.status === 'pendente').length !== 1 ? 's' : ''}`);
        doc.moveDown(1.2);

        // Metas de Poupança - mais compacto
        doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('METAS DE POUPANÇA');
        doc.moveDown(0.3);

        if (savingsGoals.length > 0) {
          const progress = totalSavingsTarget > 0 ? ((totalSavingsCurrent / totalSavingsTarget) * 100) : 0;
          doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Total de ${savingsGoals.length} meta${savingsGoals.length !== 1 ? 's' : ''}`);
          doc.text(`Meta Total: ${formatCurrency(totalSavingsTarget)}`);
          doc.text(`Poupado: ${formatCurrency(totalSavingsCurrent)}`);
          doc.fillColor('#8B5CF6').font('Helvetica-Bold').text(`Progresso: ${progress.toFixed(1)}%`);
        } else {
          doc.fontSize(9).fillColor('#9CA3AF').font('Helvetica').text('Nenhuma meta registrada');
        }
        doc.moveDown(1.2);

        // Patrimônio Líquido - mais compacto
        const netWorth = totalBalance + totalLoanAmount - totalDebtAmount;
        doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('PATRIMÔNIO LÍQUIDO');
        doc.moveDown(0.3);
        doc.fontSize(16).fillColor(netWorth >= 0 ? '#059669' : '#DC2626').font('Helvetica-Bold').text(formatCurrency(netWorth));
        doc.fontSize(8).fillColor('#6B7280').font('Helvetica').text('(Saldo + Empréstimos a Receber - Dívidas a Pagar)');

        // Footer - mais compacto
        doc.fontSize(7).fillColor('#9CA3AF').text(
          `Gerado por Finance Control em ${new Date().toLocaleString('pt-AO')}`,
          40,
          doc.page.height - 40,
          { align: 'center', width: doc.page.width - 80 }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}