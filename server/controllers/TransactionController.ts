import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertTransactionSchema } from '@shared/schema';
import { AccountModel } from '../models/Account';

export class TransactionController {
  static async create(req: Request, res: Response) {
    try {
      const validation = insertTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.errors 
        });
      }

      const transaction = await storage.createTransaction({
        ...validation.data,
        userId: req.user.id
      });

      // Recalculate account balance
      if (transaction.accountId) {
        await AccountModel.calculateBalance(transaction.accountId);
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        category, 
        minAmount, 
        maxAmount, 
        startDate, 
        endDate,
        type,
        accountId 
      } = req.query;

      const filters = {
        search: search as string,
        category: category as string,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as 'receita' | 'despesa',
        accountId: accountId ? parseInt(accountId as string) : undefined
      };

      const result = await storage.getTransactions(
        req.user.id, 
        parseInt(page as string), 
        parseInt(limit as string),
        filters
      );

      res.json(result);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransactionById(parseInt(id));
      
      if (!transaction || transaction.userId !== req.user.id) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validation = insertTransactionSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.errors 
        });
      }

      const existingTransaction = await storage.getTransactionById(parseInt(id));
      if (!existingTransaction || existingTransaction.userId !== req.user.id) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const transaction = await storage.updateTransaction(parseInt(id), validation.data);

      // Recalculate account balance for both old and new account if changed
      if (existingTransaction.accountId) {
        await AccountModel.calculateBalance(existingTransaction.accountId);
      }
      if (transaction.accountId && transaction.accountId !== existingTransaction.accountId) {
        await AccountModel.calculateBalance(transaction.accountId);
      }

      res.json(transaction);
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const transaction = await storage.getTransactionById(parseInt(id));
      if (!transaction || transaction.userId !== req.user.id) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      await storage.deleteTransaction(parseInt(id));

      // Recalculate account balance
      if (transaction.accountId) {
        await AccountModel.calculateBalance(transaction.accountId);
      }

      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await storage.getTransactionStats(req.user.id, start, end);
      res.json(stats);
    } catch (error) {
      console.error('Get transaction stats error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}