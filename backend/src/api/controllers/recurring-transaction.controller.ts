import { Request, Response, NextFunction } from "express";
import { RecurringTransactionService } from "../../domain/services/recurring-transaction.service.js";
import { TransactionRepository } from "../../domain/repositories/transaction.repository.js";
import { AccountRepository } from "../../domain/repositories/account.repository.js";
import { CategoryRepository } from "../../domain/repositories/category.repository.js";

export class RecurringTransactionController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = (req as any).organizationId;
      
      let transactions;
      if (organizationId) {
        transactions = await TransactionRepository.findRecurringByOrganizationId(organizationId);
      } else {
        transactions = await TransactionRepository.findRecurringByUserId(userId);
      }
      
      // Enrich with account and category names
      const enrichedTransactions = await Promise.all(
        transactions.map(async (t) => {
          const account = t.accountId ? await AccountRepository.findById(t.accountId) : null;
          const category = t.category ? await CategoryRepository.findByNameAndUser(t.category, userId) : null;
          const lastExecution = await TransactionRepository.getLastRecurringExecution(t.id);
          const executionCount = await RecurringTransactionService.getExecutionCount(t.id);
          
          return {
            id: t.id,
            type: t.type,
            description: t.description,
            amount: t.amount,
            categoryId: category?.id || null,
            categoryName: t.category,
            accountId: t.accountId,
            accountName: account?.name || 'Conta não encontrada',
            frequency: t.recurringFrequency,
            isActive: t.isRecurring,
            nextExecution: RecurringTransactionService.calculateNextExecution(t),
            lastExecution,
            createdAt: t.createdAt,
            executionCount,
            userId: t.userId,
          };
        })
      );
      
      res.json({
        status: "success",
        data: { recurringTransactions: enrichedTransactions }
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = (req as any).organizationId;
      const { type, description, amount, categoryId, accountId, frequency, startDate, endDate } = req.body;
      
      // Get category name
      const category = categoryId ? await CategoryRepository.findById(categoryId) : null;
      
      const transaction = await TransactionRepository.create({
        userId,
        organizationId,
        accountId,
        type,
        description,
        amount: amount.toString(),
        category: category?.name || null,
        date: new Date(startDate),
        isRecurring: true,
        recurringFrequency: frequency,
      });
      
      res.status(201).json({
        status: "success",
        data: { recurringTransaction: transaction }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUpcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
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

  static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transactionId = parseInt(req.params.id);
      
      await RecurringTransactionService.activateRecurringTransaction(userId, transactionId);
      
      res.json({
        status: "success",
        message: "Transação recorrente ativada com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
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

  static async executeNow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transactionId = parseInt(req.params.id);
      
      const newTransaction = await RecurringTransactionService.executeRecurringTransactionNow(userId, transactionId);
      
      res.json({
        status: "success",
        message: "Transação executada com sucesso",
        data: { transaction: newTransaction }
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transactionId = parseInt(req.params.id);
      
      const transaction = await TransactionRepository.findById(transactionId);
      
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({
          status: "error",
          message: "Transação não encontrada"
        });
      }
      
      await TransactionRepository.delete(transactionId);
      
      res.json({
        status: "success",
        message: "Transação recorrente excluída com sucesso"
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