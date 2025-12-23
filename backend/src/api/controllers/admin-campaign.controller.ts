import { Request, Response } from 'express';
import { campaignService } from '../../domain/services/campaign.service.js';

export class AdminCampaignController {
  // GET /api/admin/campaigns
  static async getAllCampaigns(req: Request, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const campaigns = await campaignService.getAllCampaigns(includeInactive);

      res.json({
        success: true,
        data: campaigns,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar campanhas',
      });
    }
  }

  // GET /api/admin/campaigns/:id
  static async getCampaignById(req: Request, res: Response) {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await campaignService.getCampaignById(campaignId);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campanha não encontrada',
        });
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar campanha',
      });
    }
  }

  // POST /api/admin/campaigns
  static async createCampaign(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        discountType,
        discountValue,
        couponCode,
        validFrom,
        validUntil,
        usageLimit,
        applicablePlans,
        minAmount,
        maxDiscount,
        isActive,
      } = req.body;

      if (!name || !discountType || discountValue === undefined || !couponCode) {
        return res.status(400).json({
          success: false,
          message: 'Nome, tipo de desconto, valor e código do cupão são obrigatórios',
        });
      }

      const campaign = await campaignService.createCampaign({
        name,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        couponCode,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
        applicablePlans,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        isActive,
      });

      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campanha criada com sucesso',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao criar campanha',
      });
    }
  }

  // PUT /api/admin/campaigns/:id
  static async updateCampaign(req: Request, res: Response) {
    try {
      const campaignId = parseInt(req.params.id);
      const updateData = { ...req.body };

      if (updateData.discountValue !== undefined) {
        updateData.discountValue = parseFloat(updateData.discountValue);
      }
      if (updateData.minAmount !== undefined) {
        updateData.minAmount = parseFloat(updateData.minAmount);
      }
      if (updateData.maxDiscount !== undefined) {
        updateData.maxDiscount = parseFloat(updateData.maxDiscount);
      }
      if (updateData.usageLimit !== undefined) {
        updateData.usageLimit = parseInt(updateData.usageLimit);
      }
      if (updateData.validFrom) {
        updateData.validFrom = new Date(updateData.validFrom);
      }
      if (updateData.validUntil) {
        updateData.validUntil = new Date(updateData.validUntil);
      }

      const campaign = await campaignService.updateCampaign(campaignId, updateData);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campanha não encontrada',
        });
      }

      res.json({
        success: true,
        data: campaign,
        message: 'Campanha actualizada com sucesso',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao actualizar campanha',
      });
    }
  }

  // PATCH /api/admin/campaigns/:id/toggle
  static async toggleCampaignStatus(req: Request, res: Response) {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await campaignService.toggleCampaignStatus(campaignId);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campanha não encontrada',
        });
      }

      res.json({
        success: true,
        data: campaign,
        message: campaign.isActive ? 'Campanha activada' : 'Campanha desactivada',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao alterar status da campanha',
      });
    }
  }

  // DELETE /api/admin/campaigns/:id
  static async deleteCampaign(req: Request, res: Response) {
    try {
      const campaignId = parseInt(req.params.id);
      const result = await campaignService.deleteCampaign(campaignId);

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
        message: error.message || 'Erro ao eliminar campanha',
      });
    }
  }

  // GET /api/admin/campaigns/:id/usage
  static async getCampaignUsage(req: Request, res: Response) {
    try {
      const campaignId = parseInt(req.params.id);
      const usage = await campaignService.getCampaignUsage(campaignId);

      res.json({
        success: true,
        data: usage,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar utilizações da campanha',
      });
    }
  }

  // GET /api/admin/campaigns/:id/stats
  static async getCampaignStats(req: Request, res: Response) {
    try {
      const campaignId = parseInt(req.params.id);
      const stats = await campaignService.getCampaignStats(campaignId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas da campanha',
      });
    }
  }
}
