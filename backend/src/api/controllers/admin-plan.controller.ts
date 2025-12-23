import { Request, Response } from 'express';
import { planService } from '../../domain/services/plan.service.js';

export class AdminPlanController {
  // GET /api/admin/plans-v2
  static async getAllPlans(req: Request, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const plans = await planService.getAllPlans(includeInactive);
      
      res.json({
        success: true,
        data: plans,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar planos',
      });
    }
  }

  // GET /api/admin/plans-v2/:id
  static async getPlanById(req: Request, res: Response) {
    try {
      const planId = parseInt(req.params.id);
      const plan = await planService.getPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plano não encontrado',
        });
      }

      res.json({
        success: true,
        data: plan,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar plano',
      });
    }
  }

  // POST /api/admin/plans-v2
  static async createPlan(req: Request, res: Response) {
    try {
      const {
        name,
        type,
        price,
        features,
        maxAccounts,
        maxTransactions,
        durationDays,
        trialDays,
        billingCycle,
        description,
        sortOrder,
        isActive,
      } = req.body;

      if (!name || !type || price === undefined || !features) {
        return res.status(400).json({
          success: false,
          message: 'Nome, tipo, preço e funcionalidades são obrigatórios',
        });
      }

      const plan = await planService.createPlan({
        name,
        type,
        price: parseFloat(price),
        features,
        maxAccounts,
        maxTransactions,
        durationDays,
        trialDays,
        billingCycle,
        description,
        sortOrder,
        isActive,
      });

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Plano criado com sucesso',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao criar plano',
      });
    }
  }

  // PUT /api/admin/plans-v2/:id
  static async updatePlan(req: Request, res: Response) {
    try {
      const planId = parseInt(req.params.id);
      const updateData = req.body;

      if (updateData.price !== undefined) {
        updateData.price = parseFloat(updateData.price);
      }

      const plan = await planService.updatePlan(planId, updateData);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plano não encontrado',
        });
      }

      res.json({
        success: true,
        data: plan,
        message: 'Plano actualizado com sucesso',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao actualizar plano',
      });
    }
  }

  // PATCH /api/admin/plans-v2/:id/toggle
  static async togglePlanStatus(req: Request, res: Response) {
    try {
      const planId = parseInt(req.params.id);
      const plan = await planService.togglePlanStatus(planId);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plano não encontrado',
        });
      }

      res.json({
        success: true,
        data: plan,
        message: plan.isActive ? 'Plano activado' : 'Plano desactivado',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao alterar status do plano',
      });
    }
  }

  // DELETE /api/admin/plans-v2/:id
  static async deletePlan(req: Request, res: Response) {
    try {
      const planId = parseInt(req.params.id);
      const result = await planService.deletePlan(planId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao eliminar plano',
      });
    }
  }

  // GET /api/admin/plans-v2/:id/stats
  static async getPlanStats(req: Request, res: Response) {
    try {
      const planId = parseInt(req.params.id);
      const stats = await planService.getPlanStats(planId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas do plano',
      });
    }
  }
}
