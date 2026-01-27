import { Request, Response, NextFunction } from "express";
import { db } from "../../core/database/db.js";
import { accountTypes } from "../../core/database/schema.js";
import { eq, asc } from "drizzle-orm";
import { logger } from "../../core/utils/logger.js";

export class AccountTypeController {
  /**
   * Lista todos os tipos de conta ativos
   */
  static async getAccountTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await db
        .select()
        .from(accountTypes)
        .where(eq(accountTypes.isActive, true))
        .orderBy(asc(accountTypes.displayOrder), asc(accountTypes.name));

      res.json({
        status: "success",
        data: types,
      });
    } catch (error) {
      logger.error("Error fetching account types:", error);
      next(error);
    }
  }

  /**
   * Busca um tipo de conta por código
   */
  static async getAccountTypeByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;

      const [type] = await db
        .select()
        .from(accountTypes)
        .where(eq(accountTypes.code, code))
        .limit(1);

      if (!type) {
        return res.status(404).json({
          status: "error",
          message: "Tipo de conta não encontrado",
        });
      }

      res.json({
        status: "success",
        data: type,
      });
    } catch (error) {
      logger.error("Error fetching account type:", error);
      next(error);
    }
  }

  /**
   * Lista todos os tipos de conta (admin)
   */
  static async getAllAccountTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await db
        .select()
        .from(accountTypes)
        .orderBy(asc(accountTypes.displayOrder), asc(accountTypes.name));

      res.json({
        status: "success",
        data: types,
      });
    } catch (error) {
      logger.error("Error fetching all account types:", error);
      next(error);
    }
  }

  /**
   * Cria um novo tipo de conta (admin)
   */
  static async createAccountType(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, description, icon, color, displayOrder } = req.body;

      if (!code || !name) {
        return res.status(400).json({
          status: "error",
          message: "Código e nome são obrigatórios",
        });
      }

      const [newType] = await db
        .insert(accountTypes)
        .values({
          code: code.toUpperCase(),
          name,
          description: description || null,
          icon: icon || null,
          color: color || null,
          displayOrder: displayOrder || 0,
          isActive: true,
        })
        .returning();

      res.status(201).json({
        status: "success",
        data: newType,
      });
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({
          status: "error",
          message: "Já existe um tipo de conta com este código",
        });
      }
      logger.error("Error creating account type:", error);
      next(error);
    }
  }

  /**
   * Atualiza um tipo de conta (admin)
   */
  static async updateAccountType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { code, name, description, icon, color, displayOrder, isActive } = req.body;

      const [updatedType] = await db
        .update(accountTypes)
        .set({
          code: code?.toUpperCase(),
          name,
          description: description || null,
          icon: icon || null,
          color: color || null,
          displayOrder,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(accountTypes.id, parseInt(id)))
        .returning();

      if (!updatedType) {
        return res.status(404).json({
          status: "error",
          message: "Tipo de conta não encontrado",
        });
      }

      res.json({
        status: "success",
        data: updatedType,
      });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({
          status: "error",
          message: "Já existe um tipo de conta com este código",
        });
      }
      logger.error("Error updating account type:", error);
      next(error);
    }
  }

  /**
   * Deleta um tipo de conta (admin)
   */
  static async deleteAccountType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [deletedType] = await db
        .delete(accountTypes)
        .where(eq(accountTypes.id, parseInt(id)))
        .returning();

      if (!deletedType) {
        return res.status(404).json({
          status: "error",
          message: "Tipo de conta não encontrado",
        });
      }

      res.json({
        status: "success",
        message: "Tipo de conta eliminado com sucesso",
      });
    } catch (error) {
      logger.error("Error deleting account type:", error);
      next(error);
    }
  }

  /**
   * Toggle ativo/inativo (admin)
   */
  static async toggleAccountType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const [updatedType] = await db
        .update(accountTypes)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(accountTypes.id, parseInt(id)))
        .returning();

      if (!updatedType) {
        return res.status(404).json({
          status: "error",
          message: "Tipo de conta não encontrado",
        });
      }

      res.json({
        status: "success",
        data: updatedType,
      });
    } catch (error) {
      logger.error("Error toggling account type:", error);
      next(error);
    }
  }
}
