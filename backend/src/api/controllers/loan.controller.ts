import { Request, Response, NextFunction } from "express";
import { LoanService } from "../../domain/services/loan.service.js";

export class LoanController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const loan = await LoanService.createLoan(userId, req.body);
      
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
      const userId = req.user!.userId;
      const loans = await LoanService.getLoansByUserId(userId);
      
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
      const userId = req.user!.userId;
      const loanId = parseInt(req.params.id);
      const loan = await LoanService.getLoanById(userId, loanId);
      
      res.json({
        status: "success",
        data: { loan }
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const loanId = parseInt(req.params.id);
      const loan = await LoanService.updateLoan(userId, loanId, req.body);
      
      res.json({
        status: "success",
        data: { loan },
        message: "Empréstimo atualizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const loanId = parseInt(req.params.id);
      await LoanService.deleteLoan(userId, loanId);
      
      res.json({
        status: "success",
        message: "Empréstimo removido com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await LoanService.getLoansSummary(userId);
      
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
      const userId = req.user!.userId;
      const overdueLoans = await LoanService.getOverdueLoans(userId);
      
      res.json({
        status: "success",
        data: { loans: overdueLoans }
      });
    } catch (error) {
      next(error);
    }
  }
}