import { Request, Response, NextFunction } from "express";
import { AccountService } from "../../domain/services/account.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export class AccountController {
  static async getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const accounts = await AccountService.getUserAccounts(userId);
      
      res.json({
        status: 'success',
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavingsAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const accounts = await AccountService.getSavingsAccounts(userId);
      
      res.json({
        status: 'success',
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      const account = await AccountService.getAccountById(accountId, userId);
      
      res.json({
        status: 'success',
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const account = await AccountService.createAccount(req.body, userId);
      
      res.status(201).json({
        status: 'success',
        data: account,
        message: 'Account created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      const account = await AccountService.updateAccount(accountId, req.body, userId);
      
      res.json({
        status: 'success',
        data: account,
        message: 'Account updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      await AccountService.deleteAccount(accountId, userId);
      
      res.json({
        status: 'success',
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await AccountService.getAccountSummary(userId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}