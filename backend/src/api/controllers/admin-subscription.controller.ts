import { Request, Response } from 'express';
import { subscriptionService, SubscriptionStatus } from '../../domain/services/subscription.service.js';

export class AdminSubscriptionController {
  // GET /api/admin/subscriptions
  static async getAllSubscriptions(req: Request, res: Response) {
    try {
      const {
        status,
        planId,
        startDateFrom,
        startDateTo,
        page,
        limit,
      } = req.query;

      const filters: any = {};

      if (status) {
        filters.status = status as SubscriptionStatus;
      }
      if (planId) {
        filters.planId = parseInt(planId as string);
      }
      if (startDateFrom) {
        filters.startDateFrom = new Date(startDateFrom as string);
      }
      if (startDateTo) {
        filters.startDateTo = new Date(startDateTo as string);
      }
      if (page) {
        filters.page = parseInt(page as string);
      }
      if (limit) {
        filters.limit = parseInt(limit as string);
      }

      const result = await subscriptionService.getSubscriptionsForAdmin(filters);

      res.json({
        success: true,
        data: result.subscriptions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar assinaturas',
      });
    }
  }

  // GET /api/admin/subscriptions/stats
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await subscriptionService.getSubscriptionStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas',
      });
    }
  }

  // GET /api/admin/subscriptions/:id
  static async getSubscriptionById(req: Request, res: Response) {
    try {
      const subscriptionId = parseInt(req.params.id);
      const subscription = await subscriptionService.getSubscriptionDetails(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada',
        });
      }

      // Get payment history
      const payments = await subscriptionService.getPaymentHistory(subscription.userId);

      res.json({
        success: true,
        data: {
          ...subscription,
          payments,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar assinatura',
      });
    }
  }

  // PATCH /api/admin/subscriptions/:id/status
  static async updateStatus(req: Request, res: Response) {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status é obrigatório',
        });
      }

      const validStatuses: SubscriptionStatus[] = ['active', 'trial', 'expired', 'cancelled', 'pending'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido',
        });
      }

      const subscription = await subscriptionService.updateSubscriptionStatus(subscriptionId, status);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada',
        });
      }

      res.json({
        success: true,
        data: subscription,
        message: 'Status actualizado com sucesso',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao actualizar status',
      });
    }
  }

  // POST /api/admin/subscriptions/:id/extend
  static async extendSubscription(req: Request, res: Response) {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { days } = req.body;

      if (!days || days <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Número de dias deve ser maior que zero',
        });
      }

      const subscription = await subscriptionService.extendSubscription(subscriptionId, days);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada',
        });
      }

      res.json({
        success: true,
        data: subscription,
        message: `Assinatura estendida por ${days} dias`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao estender assinatura',
      });
    }
  }

  // GET /api/admin/subscriptions/export
  static async exportSubscriptions(req: Request, res: Response) {
    try {
      const { status, planId } = req.query;

      const filters: any = { limit: 10000 }; // Get all for export

      if (status) {
        filters.status = status as SubscriptionStatus;
      }
      if (planId) {
        filters.planId = parseInt(planId as string);
      }

      const result = await subscriptionService.getSubscriptionsForAdmin(filters);

      // Generate CSV
      const headers = [
        'ID',
        'Utilizador',
        'Email',
        'Telefone',
        'Plano',
        'Status',
        'Tipo Pagamento',
        'Data Início',
        'Data Fim',
        'Trial Termina',
        'Dias Restantes',
      ];

      const rows = result.subscriptions.map((sub) => [
        sub.id,
        sub.user ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() : 'N/A',
        sub.user?.email || 'N/A',
        sub.user?.phone || 'N/A',
        sub.plan?.name || sub.planId,
        sub.status,
        sub.paymentType,
        sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : 'N/A',
        sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : 'N/A',
        sub.trialEndsAt ? new Date(sub.trialEndsAt).toISOString().split('T')[0] : 'N/A',
        sub.daysRemaining || 0,
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao exportar assinaturas',
      });
    }
  }
}
