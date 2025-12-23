import { Request, Response, NextFunction } from "express";
import { TransferService } from "../../domain/services/transfer.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class TransferController {
  static async getTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const { startDate, endDate, accountId } = req.query;
      
      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        accountId: accountId ? parseInt(accountId as string) : undefined,
      };

      const transfers = await TransferService.getTransfers(organizationId, userId, filters);
      
      res.json({
        status: 'success',
        data: transfers,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransferById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const transferId = parseInt(req.params.id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid transfer ID',
        });
      }

      const transfer = await TransferService.getTransferById(transferId, userId, organizationId);
      
      res.json({
        status: 'success',
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const transfer = await TransferService.createTransfer(req.body, userId, organizationId);
      
      res.status(201).json({
        status: 'success',
        data: transfer,
        message: 'Transfer completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const transferId = parseInt(req.params.id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid transfer ID',
        });
      }

      await TransferService.deleteTransfer(transferId, userId, organizationId);
      
      res.json({
        status: 'success',
        message: 'Transfer reversed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransferSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const summary = await TransferService.getTransferSummary(userId, organizationId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountTransferHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const accountId = parseInt(req.params.accountId);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid account ID',
        });
      }

      const transfers = await TransferService.getAccountTransferHistory(accountId, userId, organizationId);
      
      res.json({
        status: 'success',
        data: transfers,
      });
    } catch (error) {
      next(error);
    }
  }
}