import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../../domain/services/category.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export class CategoryController {
  static async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getAllCategories();
      
      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoriesByType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      
      if (type !== 'receita' && type !== 'despesa') {
        return res.status(400).json({
          status: 'error',
          message: 'Type must be "receita" or "despesa"',
        });
      }

      const categories = await CategoryService.getCategoriesByType(type);
      
      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID',
        });
      }

      const category = await CategoryService.getCategoryById(categoryId);
      
      res.json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategorySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summary = await CategoryService.getCategorySummary();
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDefaultCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const defaults = await CategoryService.getDefaultCategories();
      
      res.json({
        status: 'success',
        data: defaults,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDefaultCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.createDefaultCategories();
      
      res.json({
        status: 'success',
        data: categories,
        message: 'Default categories created successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}