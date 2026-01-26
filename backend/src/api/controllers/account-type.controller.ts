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
}
