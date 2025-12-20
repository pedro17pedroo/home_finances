import { Request, Response, NextFunction } from "express";
import { DebtService } from "../../domain/services/debt.service.js";

export class DebtController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const debt = await DebtService.createDebt(userId, req.body);
      
      res.status(201).json({
        status: "success",
        data: { debt },
        message: "Dívida criada com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const debts = await DebtService.getDebtsByUserId(userId);
      
      res.json({
        status: "success",
        data: { debts }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const debtId = parseInt(req.params.id);
      const debt = await DebtService.getDebtById(userId, debtId);
      
      res.json({
        status: "success",
        data: { debt }
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const debtId = parseInt(req.params.id);
      const debt = await DebtService.updateDebt(userId, debtId, req.body);
      
      res.json({
        status: "success",
        data: { debt },
        message: "Dívida atualizada com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const debtId = parseInt(req.params.id);
      await DebtService.deleteDebt(userId, debtId);
      
      res.json({
        status: "success",
        message: "Dívida removida com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await DebtService.getDebtsSummary(userId);
      
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
      const overdueDebts = await DebtService.getOverdueDebts(userId);
      
      res.json({
        status: "success",
        data: { debts: overdueDebts }
      });
    } catch (error) {
      next(error);
    }
  }
}