import { Request, Response, NextFunction } from "express";
import { AccountService } from "../../domain/services/account.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class AccountController {
  static async getAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      
      const accounts = organizationId 
        ? await AccountService.getAccounts({ userId, organizationId })
        : await AccountService.getUserAccounts(userId);
      
      res.json({
        status: 'success',
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavingsAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const accounts = await AccountService.getSavingsAccounts(userId, organizationId);
      
      res.json({
        status: 'success',
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      const account = await AccountService.getAccountById(accountId, userId, organizationId);
      
      res.json({
        status: 'success',
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const account = await AccountService.createAccount(req.body, userId, organizationId);
      
      res.status(201).json({
        status: 'success',
        data: account,
        message: 'Account created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      const account = await AccountService.updateAccount(accountId, req.body, userId, organizationId);
      
      res.json({
        status: 'success',
        data: account,
        message: 'Account updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      await AccountService.deleteAccount(accountId, userId, organizationId);
      
      res.json({
        status: 'success',
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const summary = await AccountService.getAccountSummary(userId, organizationId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}