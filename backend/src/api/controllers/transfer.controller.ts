import { Request, Response, NextFunction } from "express";
import { TransferService } from "../../domain/services/transfer.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export class TransferController {
  static async getTransfers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, accountId } = req.query;
      
      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        accountId: accountId ? parseInt(accountId as string) : undefined,
      };

      const transfers = await TransferService.getUserTransfers(userId, filters);
      
      res.json({
        status: 'success',
        data: transfers,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransferById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const transferId = parseInt(req.params.id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid transfer ID',
        });
      }

      const transfer = await TransferService.getTransferById(transferId, userId);
      
      res.json({
        status: 'success',
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const transfer = await TransferService.createTransfer(req.body, userId);
      
      res.status(201).json({
        status: 'success',
        data: transfer,
        message: 'Transfer completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const transferId = parseInt(req.params.id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid transfer ID',
        });
      }

      await TransferService.deleteTransfer(transferId, userId);
      
      res.json({
        status: 'success',
        message: 'Transfer reversed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransferSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await TransferService.getTransferSummary(userId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountTransferHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const accountId = parseInt(req.params.accountId);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      const transfers = await TransferService.getAccountTransferHistory(accountId, userId);
      
      res.json({
        status: 'success',
        data: transfers,
      });
    } catch (error) {
      next(error);
    }
  }
}