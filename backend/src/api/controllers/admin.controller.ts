import { Request, Response, NextFunction } from "express";
import { AdminService } from "../../domain/services/admin.service.js";

export class AdminController {
  // Authentication
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.login(req.body);
      
      res.json({
        status: "success",
        data: result,
        message: "Login realizado com sucesso"
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.userId; // Admin logado
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
      
      res.json({
        status: "success",
        data: { plans }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.userId;
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
      const adminId = req.user!.userId;
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
      const adminId = req.user!.userId;
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
      
      const result = await AdminService.getAllUsers(page, limit);
      
      res.json({
        status: "success",
        data: result
      });
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

  // Content Management
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
      const adminId = req.user!.userId;
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
      const adminId = req.user!.userId;
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
}