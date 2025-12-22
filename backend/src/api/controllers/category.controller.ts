import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../../domain/services/category.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export class CategoryController {
  static async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const categories = await CategoryService.getAllCategories(userId);
      
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
      const userId = req.user!.id;
      const { type } = req.params;
      
      if (type !== 'receita' && type !== 'despesa') {
        return res.status(400).json({
          status: 'error',
          message: 'Type must be "receita" or "despesa"',
        });
      }

      const categories = await CategoryService.getCategoriesByType(type, userId);
      
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
      const userId = req.user!.id;
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID',
        });
      }

      const category = await CategoryService.getCategoryById(categoryId, userId);
      
      res.json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, type, color, icon } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({
          status: 'error',
          message: 'Name and type are required',
        });
      }

      if (type !== 'receita' && type !== 'despesa') {
        return res.status(400).json({
          status: 'error',
          message: 'Type must be "receita" or "despesa"',
        });
      }

      const category = await CategoryService.createCategory({ name, type, color, icon }, userId);
      
      res.status(201).json({
        status: 'success',
        data: category,
        message: 'Category created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID',
        });
      }

      await CategoryService.deleteCategory(categoryId, userId);
      
      res.json({
        status: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategorySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const summary = await CategoryService.getCategorySummary(userId);
      
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
      const defaults = CategoryService.getDefaultCategoryNames();
      
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
      const userId = req.user!.id;
      const categories = await CategoryService.createDefaultCategoriesForUser(userId);
      
      res.json({
        status: 'success',
        data: categories,
        message: categories.length > 0 
          ? 'Default categories created successfully' 
          : 'User already has categories',
      });
    } catch (error) {
      next(error);
    }
  }
}
