import { Request, Response, NextFunction } from "express";
import { AdvancedReportsService } from "../../domain/services/advanced-reports.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class AdvancedReportsController {
  static async getFinancialOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const months = parseInt(req.query.months as string) || 12;
      
      const overview = await AdvancedReportsService.getFinancialOverview(organizationId, userId, months);
      
      res.json({
        status: "success",
        data: overview
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCashFlowAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      
      const analysis = await AdvancedReportsService.getCashFlowAnalysis(organizationId, userId);
      
      res.json({
        status: "success",
        data: { analysis }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDebtAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      
      const analysis = await AdvancedReportsService.getDebtAnalysis(organizationId, userId);
      
      res.json({
        status: "success",
        data: { analysis }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPeriodComparison(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const currentMonths = parseInt(req.query.currentMonths as string) || 6;
      const previousMonths = parseInt(req.query.previousMonths as string) || 6;
      
      const comparison = await AdvancedReportsService.getPeriodComparison(organizationId, userId, currentMonths, previousMonths);
      
      res.json({
        status: "success",
        data: { comparison }
      });
    } catch (error) {
      next(error);
    }
  }
}