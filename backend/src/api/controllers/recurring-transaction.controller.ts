import { Request, Response, NextFunction } from "express";
import { RecurringTransactionService } from "../../domain/services/recurring-transaction.service.js";
import { AccountRepository } from "../../domain/repositories/account.repository.js";
import { CategoryRepository } from "../../domain/repositories/category.repository.js";

export class RecurringTransactionController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = (req as any).organizationId;

      const transactions = await RecurringTransactionService.getRecurringTransactionsByUser(
        userId,
        organizationId
      );

      const enrichedTransactions = await Promise.all(
        transactions.map(async (t) => {
          const account = await AccountRepository.findById(t.accountId);
          const category = await CategoryRepository.findByNameAndUser(t.category, userId);

          return {
            id: t.id,
            type: t.type,
            description: t.description,
            amount: t.amount,
            categoryId: category?.id || null,
            categoryName: t.category,
            accountId: t.accountId,
            accountName: account?.name || 'Conta não encontrada',
            frequency: t.frequency,
            interval: t.interval,
            dayOfWeek: t.dayOfWeek,
            dayOfMonth: t.dayOfMonth,
            monthOfYear: t.monthOfYear,
            startDate: t.startDate,
            endDate: t.endDate,
            nextExecutionDate: t.nextExecutionDate,
            lastExecutionDate: t.lastExecutionDate,
            isActive: t.isActive,
            maxOccurrences: t.maxOccurrences,
            executionCount: t.executionCount,
            notifyBeforeDays: t.notifyBeforeDays,
            notificationChannels: t.notificationChannels,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
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

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transactionId = parseInt(req.params.id);

      const transaction = await RecurringTransactionService.getRecurringTransactionById(transactionId, userId);
      
      if (!transaction) {
        return res.status(404).json({
          status: "error",
          message: "Transação recorrente não encontrada"
        });
      }

      const account = await AccountRepository.findById(transaction.accountId);
      const category = await CategoryRepository.findByNameAndUser(transaction.category, userId);

      const enrichedTransaction = {
        id: transaction.id,
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        categoryId: category?.id || null,
        categoryName: transaction.category,
        accountId: transaction.accountId,
        accountName: account?.name || 'Conta não encontrada',
        frequency: transaction.frequency,
        interval: transaction.interval,
        dayOfWeek: transaction.dayOfWeek,
        dayOfMonth: transaction.dayOfMonth,
        monthOfYear: transaction.monthOfYear,
        startDate: transaction.startDate,
        endDate: transaction.endDate,
        nextExecutionDate: transaction.nextExecutionDate,
        lastExecutionDate: transaction.lastExecutionDate,
        isActive: transaction.isActive,
        maxOccurrences: transaction.maxOccurrences,
        executionCount: transaction.executionCount,
        notifyBeforeDays: transaction.notifyBeforeDays,
        notificationChannels: transaction.notificationChannels,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      };

      res.json({
        status: "success",
        data: { recurringTransaction: enrichedTransaction }
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = (req as any).organizationId;
      const {
        type, description, amount, categoryId, accountId, frequency, interval,
        dayOfWeek, dayOfMonth, monthOfYear, startDate, endDate, maxOccurrences,
        notifyBeforeDays, notificationChannels,
      } = req.body;

      const category = categoryId ? await CategoryRepository.findById(categoryId) : null;
      if (!category) {
        return res.status(400).json({
          status: "error",
          message: "Categoria não encontrada"
        });
      }

      const recurringTransaction = await RecurringTransactionService.createRecurringTransaction(
        userId, organizationId, accountId, type, description, amount.toString(), category.name,
        {
          frequency, interval, dayOfWeek, dayOfMonth, monthOfYear,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          maxOccurrences, notifyBeforeDays, notificationChannels,
        }
      );

      res.status(201).json({
        status: "success",
        data: { recurringTransaction }
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transactionId = parseInt(req.params.id);
      const updates = req.body;

      if (updates.categoryId) {
        const category = await CategoryRepository.findById(updates.categoryId);
        if (category) {
          updates.category = category.name;
        }
        delete updates.categoryId;
      }

      const recurringTransaction = await RecurringTransactionService.updateRecurringTransaction(
        transactionId, userId, updates
      );

      res.json({
        status: "success",
        data: { recurringTransaction }
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

      await RecurringTransactionService.activateRecurringTransaction(transactionId, userId);

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

      await RecurringTransactionService.deactivateRecurringTransaction(transactionId, userId);

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

      const recurringTx = await RecurringTransactionService.getRecurringTransactionById(transactionId, userId);
      if (!recurringTx) {
        return res.status(404).json({
          status: "error",
          message: "Transação recorrente não encontrada"
        });
      }

      const newTransaction = await RecurringTransactionService.executeRecurringTransaction(recurringTx);

      if (!newTransaction) {
        return res.status(400).json({
          status: "error",
          message: "Saldo insuficiente para executar a transação"
        });
      }

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

      await RecurringTransactionService.deleteRecurringTransaction(transactionId, userId);

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
      await RecurringTransactionService.processRecurringTransactions();

      res.json({
        status: "success",
        message: "Transações recorrentes processadas com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getExecutionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transactionId = parseInt(req.params.id);

      const history = await RecurringTransactionService.getExecutionHistory(transactionId, userId);

      res.json({
        status: "success",
        data: { history }
      });
    } catch (error) {
      next(error);
    }
  }
}
