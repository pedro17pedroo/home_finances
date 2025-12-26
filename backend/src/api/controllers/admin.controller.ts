import { Request, Response, NextFunction } from "express";
import { AdminService } from "../../domain/services/admin.service.js";

export class AdminController {
  // Authentication
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.login(req.body);
      
      res.json({
        success: true,
        ...result,
        message: "Login realizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id; // Admin logado
      await AdminService.createAdmin(req.body, adminId);
      
      res.status(201).json({
        status: "success",
        message: "Administrador criado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  // Plans Management
  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await AdminService.getAllPlans();
      res.json(plans);
    } catch (error) {
      next(error);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const plan = await AdminService.createPlan(req.body, adminId);
      
      res.status(201).json({
        status: "success",
        data: { plan },
        message: "Plano criado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const planId = parseInt(req.params.id);
      const plan = await AdminService.updatePlan(planId, req.body, adminId);
      
      res.json({
        status: "success",
        data: { plan },
        message: "Plano atualizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const planId = parseInt(req.params.id);
      await AdminService.deletePlan(planId, adminId);
      
      res.json({
        status: "success",
        message: "Plano removido com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  // Users Management
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      
      const users = await AdminService.getAllUsers(page, limit, search, status);
      res.json({ users });
    } catch (error) {
      next(error);
    }
  }

  static async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getUserStats();
      
      res.json({
        status: "success",
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      await AdminService.updateUserStatus(userId, isActive);
      
      res.json({
        status: "success",
        message: "Status do usuário atualizado"
      });
    } catch (error) {
      next(error);
    }
  }

  // Payments Management
  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const payments = await AdminService.getPayments(status);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  }

  static async approvePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentId = parseInt(req.params.id);
      const adminId = req.user!.id;
      await AdminService.approvePayment(paymentId, adminId);
      
      res.json({
        status: "success",
        message: "Pagamento aprovado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentId = parseInt(req.params.id);
      const adminId = req.user!.id;
      await AdminService.rejectPayment(paymentId, adminId);
      
      res.json({
        status: "success",
        message: "Pagamento rejeitado"
      });
    } catch (error) {
      next(error);
    }
  }

  // Security Management
  static async getSecurityEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await AdminService.getSecurityEvents();
      res.json(events);
    } catch (error) {
      next(error);
    }
  }

  static async resolveSecurityEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = parseInt(req.params.id);
      const adminId = req.user!.id;
      await AdminService.resolveSecurityEvent(eventId, adminId);
      
      res.json({
        status: "success",
        message: "Evento marcado como resolvido"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBlockedIPs(req: Request, res: Response, next: NextFunction) {
    try {
      const blockedIPs = await AdminService.getBlockedIPs();
      res.json(blockedIPs);
    } catch (error) {
      next(error);
    }
  }

  static async blockIP(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      await AdminService.blockIP(req.body, adminId);
      
      res.json({
        status: "success",
        message: "IP bloqueado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async unblockIP(req: Request, res: Response, next: NextFunction) {
    try {
      const ipId = parseInt(req.params.id);
      await AdminService.unblockIP(ipId);
      
      res.json({
        status: "success",
        message: "IP desbloqueado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  // Notifications Management
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await AdminService.getAdminNotifications();
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  }

  static async sendNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      await AdminService.sendNotification(req.body, adminId);
      
      res.json({
        status: "success",
        message: "Notificação enviada com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const notificationId = parseInt(req.params.id);
      await AdminService.deleteNotification(notificationId);
      
      res.json({
        status: "success",
        message: "Notificação removida"
      });
    } catch (error) {
      next(error);
    }
  }

  // Settings Management
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await AdminService.getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      await AdminService.updateSettings(req.body, adminId);
      
      res.json({
        status: "success",
        message: "Configurações atualizadas"
      });
    } catch (error) {
      next(error);
    }
  }

  // Reports
  static async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const period = req.query.period as string || 'month';
      const reports = await AdminService.getReports(period);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }

  // Content Management
  static async getContent(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.params.type;
      const content = await AdminService.getContentByType(type);
      res.json(content);
    } catch (error) {
      next(error);
    }
  }

  static async updateContent(req: Request, res: Response, next: NextFunction) {
    try {
      const contentId = parseInt(req.params.id);
      const adminId = req.user!.id;
      await AdminService.updateContentById(contentId, req.body, adminId);
      
      res.json({
        status: "success",
        message: "Conteúdo atualizado"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLandingContent(req: Request, res: Response, next: NextFunction) {
    try {
      const content = await AdminService.getLandingContent();
      
      res.json({
        status: "success",
        data: { content }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLandingContent(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const section = req.params.section;
      const content = await AdminService.updateLandingContent(section, req.body, adminId);
      
      res.json({
        status: "success",
        data: { content },
        message: "Conteúdo atualizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLegalContent(req: Request, res: Response, next: NextFunction) {
    try {
      const content = await AdminService.getLegalContent();
      
      res.json({
        status: "success",
        data: { content }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLegalContent(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const type = req.params.type;
      const content = await AdminService.updateLegalContent(type, req.body, adminId);
      
      res.json({
        status: "success",
        data: { content },
        message: "Conteúdo legal atualizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  // Dashboard
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getDashboardStats();
      
      res.json({
        status: "success",
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  // Audit Logs
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const logs = await AdminService.getAuditLogs(page, limit);
      
      res.json({
        status: "success",
        data: { logs }
      });
    } catch (error) {
      next(error);
    }
  }

  // Payment Methods Management
  static async getPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const methods = await AdminService.getPaymentMethods();
      res.json({ paymentMethods: methods });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const methodId = parseInt(req.params.id);
      const method = await AdminService.updatePaymentMethod(methodId, req.body);
      res.json({
        status: "success",
        data: { method },
        message: "Método de pagamento atualizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async togglePaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const methodId = parseInt(req.params.id);
      const { isActive } = req.body;
      const method = await AdminService.togglePaymentMethod(methodId, isActive);
      res.json({
        status: "success",
        data: { method },
        message: `Método de pagamento ${isActive ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }

  // Banks Management
  static async getBanks(req: Request, res: Response, next: NextFunction) {
    try {
      const banks = await AdminService.getBanks();
      res.json({ banks });
    } catch (error) {
      next(error);
    }
  }

  static async createBank(req: Request, res: Response, next: NextFunction) {
    try {
      const bank = await AdminService.createBank(req.body);
      res.status(201).json({
        status: "success",
        data: { bank },
        message: "Banco criado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBank(req: Request, res: Response, next: NextFunction) {
    try {
      const bankId = parseInt(req.params.id);
      const bank = await AdminService.updateBank(bankId, req.body);
      res.json({
        status: "success",
        data: { bank },
        message: "Banco atualizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleBank(req: Request, res: Response, next: NextFunction) {
    try {
      const bankId = parseInt(req.params.id);
      const { isActive } = req.body;
      const bank = await AdminService.toggleBank(bankId, isActive);
      res.json({
        status: "success",
        data: { bank },
        message: `Banco ${isActive ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBank(req: Request, res: Response, next: NextFunction) {
    try {
      const bankId = parseInt(req.params.id);
      await AdminService.deleteBank(bankId);
      res.json({
        status: "success",
        message: "Banco eliminado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }
}