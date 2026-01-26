import { RecurringTransactionService } from "../../domain/services/recurring-transaction.service.js";
import { logger } from "../utils/logger.js";

export class RecurringTransactionsJob {
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly INTERVAL_HOURS = 24; // Executar a cada 24 horas

  /**
   * Inicia o job de transações recorrentes
   */
  static start(): void {
    if (this.intervalId) {
      logger.warn("Job de transações recorrentes já está rodando");
      return;
    }

    logger.info("Iniciando job de transações recorrentes");
    
    // Executar imediatamente
    this.executeJob();
    
    // Agendar execuções futuras
    this.intervalId = setInterval(() => {
      this.executeJob();
    }, this.INTERVAL_HOURS * 60 * 60 * 1000);

    logger.info(`Job agendado para executar a cada ${this.INTERVAL_HOURS} horas`);
  }

  /**
   * Para o job de transações recorrentes
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Job de transações recorrentes parado");
    }
  }

  /**
   * Executa o processamento das transações recorrentes
   */
  private static async executeJob(): Promise<void> {
    try {
      logger.info("Executando job de transações recorrentes");
      
      // Processar transações que devem ser executadas
      await RecurringTransactionService.processRecurringTransactions();
      
      // Enviar notificações para transações próximas
      await RecurringTransactionService.sendUpcomingNotifications();
      
      logger.info("Job de transações recorrentes concluído com sucesso");
    } catch (error) {
      logger.error("Erro no job de transações recorrentes:", error);
    }
  }

  /**
   * Executa o job manualmente (para testes)
   */
  static async runManually(): Promise<void> {
    logger.info("Executando job de transações recorrentes manualmente");
    await this.executeJob();
  }
}