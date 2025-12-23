import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../../domain/services/category.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class CategoryController {
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const categories = await CategoryService.getCategories(organizationId, userId);
      
      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoriesByType(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const { type } = req.params;
      
      if (type !== 'receita' && type !== 'despesa') {
        return res.status(400).json({
          status: 'error',
          message: 'Type must be "receita" or "despesa"',
        });
      }

      let categories;
      if (organizationId) {
        categories = await CategoryService.getCategoriesByTypeAndOrganization(type, organizationId);
      } else {
        categories = await CategoryService.getCategoriesByType(type, userId);
      }
      
      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID',
        });
      }

      const category = await CategoryService.getCategoryById(categoryId, userId, organizationId);
      
      res.json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
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

      const category = await CategoryService.createCategory({ name, type, color, icon }, userId, organizationId);
      
      res.status(201).json({
        status: 'success',
        data: category,
        message: 'Category created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID',
        });
      }

      await CategoryService.deleteCategory(categoryId, userId, organizationId);
      
      res.json({
        status: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategorySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const summary = await CategoryService.getCategorySummary(userId, organizationId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDefaultCategories(req: Request, res: Response, next: NextFunction) {
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

  static async createDefaultCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const categories = await CategoryService.createDefaultCategories(userId, organizationId);
      
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
