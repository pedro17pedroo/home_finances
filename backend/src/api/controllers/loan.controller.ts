import { Request, Response, NextFunction } from "express";
import { LoanService } from "../../domain/services/loan.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class LoanController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const loan = await LoanService.createLoan(userId, req.body, organizationId);
      
      res.status(201).json({
        status: "success",
        data: { loan },
        message: "Empréstimo criado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const loans = await LoanService.getLoans(organizationId, userId);
      
      res.json({
        status: "success",
        data: { loans }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const loanId = parseInt(req.params.id);
      const loan = await LoanService.getLoanById(userId, loanId, organizationId);
      
      res.json({
        status: "success",
        data: { loan }
      });
    } catch (error) {
      next(error);
    }
  }

  static async makePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const loanId = parseInt(req.params.id);
      const loan = await LoanService.makePayment(userId, loanId, req.body, organizationId);
      
      res.json({
        status: "success",
        data: { loan },
        message: "Pagamento registado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const loanId = parseInt(req.params.id);
      const loan = await LoanService.cancelLoan(userId, loanId, req.body, organizationId);
      
      res.json({
        status: "success",
        data: { loan },
        message: "Empréstimo cancelado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const summary = await LoanService.getLoansSummary(userId, organizationId);
      
      res.json({
        status: "success",
        data: { summary }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOverdue(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const overdueLoans = await LoanService.getOverdueLoans(userId, organizationId);
      
      res.json({
        status: "success",
        data: { loans: overdueLoans }
      });
    } catch (error) {
      next(error);
    }
  }
}