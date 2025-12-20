import { Request, Response, NextFunction } from "express";
import { AdminRepository } from "../../domain/repositories/admin.repository.js";

export class PublicController {
  /**
   * Obter conteúdo da landing page
   */
  static async getLandingContent(req: Request, res: Response, next: NextFunction) {
    try {
      const content = await AdminRepository.getLandingContent();
      
      // Organizar conteúdo por seção
      const organizedContent = content.reduce((acc, item) => {
        acc[item.section] = {
          title: item.title,
          content: item.content,
          metadata: item.metadata ? JSON.parse(item.metadata) : null
        };
        return acc;
      }, {} as Record<string, any>);

      res.json({
        status: "success",
        data: { content: organizedContent }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obter planos disponíveis (público)
   */
  static async getPublicPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const allPlans = await AdminRepository.getAllPlans();
      
      // Filtrar apenas planos ativos e remover informações sensíveis
      const publicPlans = allPlans
        .filter(plan => plan.isActive)
        .map(plan => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          features: plan.features ? JSON.parse(plan.features) : [],
          maxAccounts: plan.maxAccounts,
          maxTransactions: plan.maxTransactions
        }));

      res.json({
        status: "success",
        data: { plans: publicPlans }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obter conteúdo legal
   */
  static async getLegalContent(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.params.type; // 'terms', 'privacy', 'contacts'
      const allContent = await AdminRepository.getLegalContent();
      
      const content = allContent.find(item => item.type === type);
      
      if (!content) {
        return res.status(404).json({
          status: "error",
          message: "Conteúdo não encontrado"
        });
      }

      res.json({
        status: "success",
        data: {
          title: content.title,
          content: content.content,
          version: content.version,
          updatedAt: content.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint de contato (formulário da landing page)
   */
  static async submitContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, message, subject } = req.body;

      // TODO: Implementar envio de email ou salvar em base de dados
      // Por agora, apenas log
      console.log('Novo contato:', { name, email, subject, message });

      res.json({
        status: "success",
        message: "Mensagem enviada com sucesso. Entraremos em contato em breve."
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Estatísticas públicas (para mostrar na landing page)
   */
  static async getPublicStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userStats = await AdminRepository.getUserStats();
      
      // Retornar apenas estatísticas não sensíveis
      res.json({
        status: "success",
        data: {
          totalUsers: userStats.total,
          activeUsers: userStats.active,
          // Adicionar outras métricas públicas se necessário
        }
      });
    } catch (error) {
      next(error);
    }
  }
}