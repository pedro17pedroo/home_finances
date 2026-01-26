import { Request, Response, NextFunction } from "express";
import { BudgetService } from "../../domain/services/budget.service.js";
import { AlertService } from "../../domain/services/alert.service.js";
import { getOrganizationId } from "../middlewares/organization.js";
import { NotFoundError, BadRequestError } from "../../core/errors/app-error.js";
import type { BudgetFilters } from "../../domain/entities/budget.types.js";

/**
 * Budget API Controller
 * 
 * Handles HTTP requests for budget management operations.
 * Implements REST API endpoints with organization-based access control.
 * 
 * Requirements: 10.1, 10.6, 10.7
 */
export class BudgetController {
  /**
   * POST /api/budgets - Create a new budget
   * 
   * Requirements:
   * - 10.1: Provide REST API endpoints for creating budgets
   * - 10.6: Enforce organization-based access control
   * - 10.7: Validate all API inputs against business rules
   * - 1.1: Require category, time period, and budget amount
   * - 1.4: Set budget status to active by default
   * - 1.6: Associate budget with user's organization
   * - 1.7: Store budget amounts in organization's currency
   */
  static async createBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      // Get organization currency
      // TODO: Fetch from organization settings
      const currency = "AOA"; // Kwanza Angolano

      // Create budget using validated data from request body
      const budget = await BudgetService.createBudget(
        req.body,
        organizationId,
        currency
      );

      res.status(201).json({
        status: "success",
        data: budget,
        message: "Budget created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets - List all budgets for the user's organization
   * 
   * Requirements:
   * - 10.1: Provide REST API endpoints for reading budgets
   * - 10.6: Enforce organization-based access control
   * - 5.1: Display all budgets for user's organization
   * 
   * Query parameters:
   * - status: Filter by budget status (active, inactive, archived)
   * - categoryId: Filter by category ID
   * - timePeriod: Filter by time period type
   */
  static async listBudgets(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      // Extract filters from query parameters
      const filters: BudgetFilters | undefined = req.query.status || req.query.categoryId || req.query.timePeriod
        ? {
            status: req.query.status as any,
            categoryId: req.query.categoryId as string,
            timePeriod: req.query.timePeriod as any,
          }
        : undefined;

      // Get budgets with current spending status
      const budgets = await BudgetService.listBudgets(organizationId, filters);

      res.json({
        status: "success",
        data: budgets,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets/:id - Get budget detail with current status
   * 
   * Requirements:
   * - 10.1: Provide REST API endpoints for reading budgets
   * - 10.6: Enforce organization-based access control
   * - 5.2: Display budget with category, amount, period, status
   * - 5.3: Show current spending amount and percentage used
   */
  static async getBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const budgetId = parseInt(req.params.id);

      if (isNaN(budgetId)) {
        throw new BadRequestError("Invalid budget ID");
      }

      // Get budget with current spending status
      const budget = await BudgetService.getBudget(budgetId, organizationId);

      res.json({
        status: "success",
        data: budget,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/budgets/:id - Update an existing budget
   * 
   * Requirements:
   * - 10.1: Provide REST API endpoints for updating budgets
   * - 10.6: Enforce organization-based access control
   * - 10.7: Validate all API inputs against business rules
   * - 6.1: Allow modification of budget amount, time period, and status
   * - 6.3: Recalculate percentage-based alert thresholds when amount changes
   * - 6.4: Recalculate spending amount when time period changes
   */
  static async updateBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const budgetId = parseInt(req.params.id);

      if (isNaN(budgetId)) {
        throw new BadRequestError("Invalid budget ID");
      }

      // Update budget using validated data from request body
      const budget = await BudgetService.updateBudget(
        budgetId,
        req.body,
        organizationId
      );

      res.json({
        status: "success",
        data: budget,
        message: "Budget updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/budgets/:id - Delete or archive a budget
   * 
   * Requirements:
   * - 10.1: Provide REST API endpoints for deleting budgets
   * - 10.6: Enforce organization-based access control
   * - 6.5: Remove all associated alerts and notification history
   * - 6.6: Archive budgets with historical data instead of deleting
   */
  static async deleteBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const budgetId = parseInt(req.params.id);

      if (isNaN(budgetId)) {
        throw new BadRequestError("Invalid budget ID");
      }

      // Delete or archive budget
      await BudgetService.deleteBudget(budgetId, organizationId);

      res.json({
        status: "success",
        message: "Budget deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/budgets/:id/alerts - Configure alerts for a budget
   * 
   * Requirements:
   * - 10.2: Provide REST API endpoints for configuring alerts
   * - 10.6: Enforce organization-based access control
   * - 10.7: Validate all API inputs against business rules
   * - 2.1: Allow up to 3 alerts per budget
   * - 2.2: Validate alert distribution (2 before, 1 after)
   * - 2.4-2.7: Validate threshold values
   */
  static async configureAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const budgetId = parseInt(req.params.id);

      if (isNaN(budgetId)) {
        throw new BadRequestError("Invalid budget ID");
      }

      // Verify budget exists and belongs to organization
      const budget = await BudgetService.getBudget(budgetId, organizationId);

      // Configure alerts using validated data from request body
      await AlertService.configureAlerts(
        budgetId,
        req.body.alerts,
        budget.amount
      );

      res.status(201).json({
        status: "success",
        message: "Alerts configured successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/alerts/:id - Update an alert
   * 
   * Requirements:
   * - 10.2: Provide REST API endpoints for updating alerts
   * - 10.6: Enforce organization-based access control
   * - 10.7: Validate all API inputs against business rules
   * - 6.2: Allow modification of alert configurations
   */
  static async updateAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        throw new BadRequestError("Invalid alert ID");
      }

      // Get the alert to find its budget
      const alertWithBudget = await AlertService.getAlertWithBudget(alertId);
      
      if (!alertWithBudget) {
        throw new NotFoundError("Alert");
      }
      
      // Verify the budget belongs to the organization
      const budget = await BudgetService.getBudget(alertWithBudget.budgetId, organizationId);

      // Update alert with proper budget amount for validation
      const updatedAlert = await AlertService.updateAlert(
        alertId,
        req.body,
        budget.amount
      );

      res.json({
        status: "success",
        data: updatedAlert,
        message: "Alert updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/alerts/:id - Delete an alert
   * 
   * Requirements:
   * - 10.2: Provide REST API endpoints for deleting alerts
   * - 10.6: Enforce organization-based access control
   */
  static async deleteAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        throw new BadRequestError("Invalid alert ID");
      }

      // Get the alert to find its budget (for organization verification)
      const alertWithBudget = await AlertService.getAlertWithBudget(alertId);
      
      if (!alertWithBudget) {
        throw new NotFoundError("Alert");
      }
      
      // Verify the budget belongs to the organization
      await BudgetService.getBudget(alertWithBudget.budgetId, organizationId);

      // Delete the alert
      await AlertService.deleteAlert(alertId);

      res.json({
        status: "success",
        message: "Alert deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets/:id/status - Get current budget status with spending
   * 
   * Requirements:
   * - 10.3: Provide REST API endpoints for retrieving budget status
   * - 10.6: Enforce organization-based access control
   * - 5.2: Display budget with category, amount, period, status
   * - 5.3: Show current spending amount and percentage used
   * 
   * This endpoint returns the same data as GET /api/budgets/:id but is
   * semantically focused on the current status and spending calculations.
   */
  static async getBudgetStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const budgetId = parseInt(req.params.id);

      if (isNaN(budgetId)) {
        throw new BadRequestError("Invalid budget ID");
      }

      // Get budget with current spending status
      const budget = await BudgetService.getBudget(budgetId, organizationId);

      res.json({
        status: "success",
        data: budget,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets/:id/history - Get archived periods for a budget
   * 
   * Requirements:
   * - 10.4: Provide REST API endpoints for retrieving notification history
   * - 9.3: Allow users to view archived budget periods
   * - 10.6: Enforce organization-based access control
   * 
   * Returns a list of archived budget periods with final spending amounts,
   * percentage used, and triggered alerts for each period.
   */
  static async getArchivedPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = getOrganizationId(req);

      if (!organizationId) {
        throw new BadRequestError("Organization context is required");
      }

      const budgetId = parseInt(req.params.id);

      if (isNaN(budgetId)) {
        throw new BadRequestError("Invalid budget ID");
      }

      // Get archived periods for this budget
      const archivedPeriods = await BudgetService.getArchivedPeriods(budgetId, organizationId);

      res.json({
        status: "success",
        data: archivedPeriods,
      });
    } catch (error) {
      next(error);
    }
  }
}
