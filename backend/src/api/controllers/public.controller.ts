import { Request, Response, NextFunction } from "express";
import { AdminRepository } from "../../domain/repositories/admin.repository.js";
import { db } from "../../core/database/db.js";
import { banks } from "../../core/database/schema.js";
import { eq } from "drizzle-orm";

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
   * Obter FAQ
   */
  static async getFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query;
      
      let items;
      if (category && typeof category === 'string') {
        items = await AdminRepository.getFaqByCategory(category);
      } else {
        items = await AdminRepository.getAllFaqItems();
      }

      // Agrupar por categoria
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push({
          id: item.id,
          question: item.question,
          answer: item.answer
        });
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        status: "success",
        data: {
          items,
          grouped,
          categories: Object.keys(grouped)
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
      const { name, email, phone, message, subject } = req.body;

      if (!name || !email || !message || !subject) {
        return res.status(400).json({
          status: "error",
          message: "Nome, email, assunto e mensagem são obrigatórios"
        });
      }

      // Salvar na base de dados
      const contactMessage = await AdminRepository.createContactMessage({
        name,
        email,
        phone: phone || null,
        subject,
        message,
        status: 'pending'
      });

      res.json({
        status: "success",
        message: "Mensagem enviada com sucesso. Entraremos em contato em breve.",
        data: { id: contactMessage.id }
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

  /**
   * Obter lista de bancos disponíveis
   */
  static async getBanks(req: Request, res: Response, next: NextFunction) {
    try {
      const banksList = await db
        .select({
          id: banks.id,
          code: banks.code,
          name: banks.name,
          shortName: banks.shortName,
          logoUrl: banks.logoUrl,
          swiftCode: banks.swiftCode,
          country: banks.country,
        })
        .from(banks)
        .where(eq(banks.isActive, true))
        .orderBy(banks.displayOrder, banks.name);

      res.json({
        status: "success",
        data: { banks: banksList }
      });
    } catch (error) {
      next(error);
    }
  }
}