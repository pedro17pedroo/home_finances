import { Request, Response, NextFunction } from "express";
import { DebtService } from "../../domain/services/debt.service.js";
import { LoanReminderService } from "../../domain/services/loan-reminder.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class DebtController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const debt = await DebtService.createDebt(userId, req.body, organizationId);
      
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
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const debts = await DebtService.getDebts(organizationId, userId);
      
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
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const debtId = parseInt(req.params.id);
      const debt = await DebtService.getDebtById(userId, debtId, organizationId);
      
      res.json({
        status: "success",
        data: { debt }
      });
    } catch (error) {
      next(error);
    }
  }

  static async makePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const debtId = parseInt(req.params.id);
      const debt = await DebtService.makePayment(userId, debtId, req.body, organizationId);
      
      res.json({
        status: "success",
        data: { debt },
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
      const debtId = parseInt(req.params.id);
      const debt = await DebtService.cancelDebt(userId, debtId, req.body, organizationId);
      
      res.json({
        status: "success",
        data: { debt },
        message: "Dívida cancelada com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const summary = await DebtService.getDebtsSummary(userId, organizationId);
      
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
      const overdueDebts = await DebtService.getOverdueDebts(userId, organizationId);
      
      res.json({
        status: "success",
        data: { debts: overdueDebts }
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const debtId = parseInt(req.params.id);
      
      // Get debt details
      const debt = await DebtService.getDebtById(userId, debtId, organizationId);
      
      if (!debt) {
        return res.status(404).json({
          status: "error",
          message: "Dívida não encontrada"
        });
      }

      // Get user info for sender name
      const user = req.user!;
      const senderName = user.email || 'Sistema';

      // Send reminder
      await LoanReminderService.sendDebtReminder(debtId, userId, {
        recipientName: debt.creditor,
        recipientEmail: (debt as any).creditorEmail,
        recipientPhone: (debt as any).creditorPhone,
        amount: debt.amount,
        dueDate: debt.dueDate ? new Date(debt.dueDate) : new Date(),
        customMessage: req.body.customMessage,
        senderName,
      });

      res.json({
        status: "success",
        message: "Lembrete enviado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }
}