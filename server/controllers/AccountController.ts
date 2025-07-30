import { Request, Response } from 'express';
import { AccountModel } from '../models/Account';
import { insertAccountSchema } from '@shared/schema';

export class AccountController {
  static async create(req: Request, res: Response) {
    try {
      const validation = insertAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.errors 
        });
      }

      const account = await AccountModel.create(req.user.id, {
        ...validation.data,
        interestRate: validation.data.interestRate || undefined
      });
      res.status(201).json(account);
    } catch (error) {
      console.error('Create account error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const accounts = await AccountModel.findByUserId(req.user.id);
      res.json(accounts);
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const account = await AccountModel.findById(parseInt(id));
      
      if (!account || account.userId !== req.user.id) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      console.error('Get account error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validation = insertAccountSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.errors 
        });
      }

      const account = await AccountModel.update(parseInt(id), req.user.id, validation.data);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      console.error('Update account error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AccountModel.delete(parseInt(id), req.user.id);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes('existing transactions')) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Delete account error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const stats = await AccountModel.getAccountStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Get account stats error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async recalculateBalance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Verify account belongs to user
      const account = await AccountModel.findById(parseInt(id));
      if (!account || account.userId !== req.user.id) {
        return res.status(404).json({ message: "Account not found" });
      }

      const newBalance = await AccountModel.calculateBalance(parseInt(id));
      res.json({ message: "Balance recalculated", balance: newBalance });
    } catch (error) {
      console.error('Recalculate balance error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}