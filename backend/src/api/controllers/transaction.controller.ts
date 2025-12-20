import { Request, Response, NextFunction } from "express";
import { TransactionService } from "../../domain/services/transaction.service.js";

export class TransactionController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { startDate, endDate, type, accountId } = req.query;

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as 'receita' | 'despesa',
        accountId: accountId ? parseInt(accountId as string) : undefined,
      };

      const transactions = await TransactionService.getUserTransactions(
        userId,
        filters
      );

      res.json({
        status: "success",
        data: { transactions },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);

      const transaction = await TransactionService.getTransactionById(id, userId);
      
      res.json({
        status: "success",
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transaction = await TransactionService.createTransaction(
        req.body,
        userId
      );

      res.status(201).json({
        status: "success",
        data: { transaction },
        message: "Transaction created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);

      const transaction = await TransactionService.updateTransaction(
        id,
        req.body,
        userId
      );

      res.json({
        status: "success",
        data: { transaction },
        message: "Transaction updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);

      await TransactionService.deleteTransaction(id, userId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const summary = await TransactionService.getTransactionSummary(
        userId,
        startDate as string,
        endDate as string
      );

      res.json({
        status: "success",
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  }
}