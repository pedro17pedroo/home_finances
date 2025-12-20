import { Request, Response, NextFunction } from "express";
import { RecurringTransactionService } from "../../domain/services/recurring-transaction.service.js";

export class RecurringTransactionController {
  static async getUpcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 30;
      
      const upcoming = await RecurringTransactionService.getUpcomingRecurringTransactions(userId, days);
      
      res.json({
        status: "success",
        data: { upcoming }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const transactionId = parseInt(req.params.id);
      
      await RecurringTransactionService.deactivateRecurringTransaction(userId, transactionId);
      
      res.json({
        status: "success",
        message: "Transação recorrente desativada com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async processAll(req: Request, res: Response, next: NextFunction) {
    try {
      // Endpoint administrativo para processar todas as transações recorrentes
      await RecurringTransactionService.processRecurringTransactions();
      
      res.json({
        status: "success",
        message: "Transações recorrentes processadas com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }
}