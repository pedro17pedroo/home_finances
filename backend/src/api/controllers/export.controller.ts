import { Request, Response, NextFunction } from "express";
import { ExportService } from "../../domain/services/export.service.js";

export class ExportController {
  static async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        format = 'json',
        startDate,
        endDate,
        includeAccounts = true,
        includeTransactions = true,
        includeLoans = true,
        includeDebts = true,
        includeSavingsGoals = true,
        includeTransfers = true
      } = req.body;

      const options = {
        format,
        dateRange: startDate && endDate ? {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        } : undefined,
        includeAccounts,
        includeTransactions,
        includeLoans,
        includeDebts,
        includeSavingsGoals,
        includeTransfers
      };

      const result = await ExportService.exportUserData(userId, options);

      // Configurar headers para download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size.toString());

      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }

  static async createBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const result = await ExportService.createFullBackup(userId);

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size.toString());

      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }

  static async exportTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const result = await ExportService.exportTransactionsCSV(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size.toString());

      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }

  static async generateSummaryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const result = await ExportService.generateFinancialSummaryReport(userId);

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size.toString());

      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
}