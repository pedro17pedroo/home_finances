import { Request, Response, NextFunction } from "express";
import { SavingsGoalService } from "../../domain/services/savings-goal.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export class SavingsGoalController {
  static async getSavingsGoals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goals = await SavingsGoalService.getUserSavingsGoals(userId);
      
      res.json({
        status: 'success',
        data: goals,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavingsGoalById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const goal = await SavingsGoalService.getSavingsGoalById(goalId, userId);
      
      res.json({
        status: 'success',
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSavingsGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goal = await SavingsGoalService.createSavingsGoal(req.body, userId);
      
      res.status(201).json({
        status: 'success',
        data: goal,
        message: 'Savings goal created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSavingsGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const goal = await SavingsGoalService.updateSavingsGoal(goalId, req.body, userId);
      
      res.json({
        status: 'success',
        data: goal,
        message: 'Savings goal updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async addToSavingsGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const goal = await SavingsGoalService.addToSavingsGoal(goalId, req.body, userId);
      
      res.json({
        status: 'success',
        data: goal,
        message: 'Amount added to savings goal successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSavingsGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      await SavingsGoalService.deleteSavingsGoal(goalId, userId);
      
      res.json({
        status: 'success',
        message: 'Savings goal deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavingsGoalsSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const summary = await SavingsGoalService.getSavingsGoalsSummary(userId);
      
      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGoalProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid savings goal ID',
        });
      }

      const progress = await SavingsGoalService.getGoalProgress(goalId, userId);
      
      res.json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}