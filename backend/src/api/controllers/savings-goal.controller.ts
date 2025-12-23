import { Request, Response, NextFunction } from "express";
import { SavingsGoalService } from "../../domain/services/savings-goal.service.js";
import { getOrganizationId } from "../middlewares/organization.js";

export class SavingsGoalController {
  static async getSavingsGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goals = await SavingsGoalService.getSavingsGoals(organizationId, userId);
      
      res.json({
        status: 'success',
        data: goals,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavingsGoalById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const goal = await SavingsGoalService.getSavingsGoalById(goalId, userId, organizationId);
      
      res.json({
        status: 'success',
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSavingsGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goal = await SavingsGoalService.createSavingsGoal(req.body, userId, organizationId);
      
      res.status(201).json({
        status: 'success',
        data: goal,
        message: 'Savings goal created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSavingsGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const goal = await SavingsGoalService.updateSavingsGoal(goalId, req.body, userId, organizationId);
      
      res.json({
        status: 'success',
        data: goal,
        message: 'Savings goal updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async addToSavingsGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const goal = await SavingsGoalService.addToSavingsGoal(goalId, req.body, userId, organizationId);
      
      res.json({
        status: 'success',
        data: goal,
        message: 'Amount added to savings goal successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSavingsGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      await SavingsGoalService.deleteSavingsGoal(goalId, userId, organizationId);
      
      res.json({
        status: 'success',
        message: 'Savings goal deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavingsGoalsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const summary = await SavingsGoalService.getSavingsGoalsSummary(userId, organizationId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGoalProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const progress = await SavingsGoalService.getGoalProgress(goalId, userId, organizationId);
      
      res.json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}