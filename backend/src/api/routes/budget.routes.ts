import { Router } from "express";
import { BudgetController } from "../controllers/budget.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { organizationContext, requireOrganization } from "../middlewares/organization.js";
import { validate } from "../middlewares/validate.js";
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetIdSchema,
  budgetFiltersSchema,
  configureAlertsSchema,
  updateAlertSchema,
  alertIdSchema,
} from "../validators/budget.validator.js";

/**
 * Budget API Routes
 * 
 * Defines REST API endpoints for budget management.
 * All routes require authentication and organization context.
 * 
 * Requirements: 10.1, 10.6, 10.7
 */
const router = Router();

// All routes require authentication and organization context
router.use(authenticate);
router.use(organizationContext);
router.use(requireOrganization);

/**
 * POST /api/budgets - Create a new budget
 * 
 * Requirements:
 * - 10.1: REST API endpoint for creating budgets
 * - 10.6: Organization-based access control
 * - 10.7: Input validation using DTOs
 */
router.post(
  "/",
  validate(createBudgetSchema),
  BudgetController.createBudget
);

/**
 * GET /api/budgets - List all budgets
 * 
 * Requirements:
 * - 10.1: REST API endpoint for reading budgets
 * - 10.6: Organization-based access control
 * 
 * Query parameters:
 * - status: Filter by budget status (active, inactive, archived)
 * - categoryId: Filter by category ID
 * - timePeriod: Filter by time period type
 */
router.get(
  "/",
  validate(budgetFiltersSchema),
  BudgetController.listBudgets
);

/**
 * GET /api/budgets/:id/status - Get current budget status with spending
 * 
 * Requirements:
 * - 10.3: REST API endpoint for retrieving budget status
 * - 10.6: Organization-based access control
 */
router.get(
  "/:id/status",
  validate(budgetIdSchema),
  BudgetController.getBudgetStatus
);

/**
 * GET /api/budgets/:id/history - Get archived periods for a budget
 * 
 * Requirements:
 * - 10.4: REST API endpoint for retrieving notification history
 * - 9.3: Allow users to view archived budget periods
 * - 10.6: Organization-based access control
 */
router.get(
  "/:id/history",
  validate(budgetIdSchema),
  BudgetController.getArchivedPeriods
);

/**
 * GET /api/budgets/:id - Get budget detail
 * 
 * Requirements:
 * - 10.1: REST API endpoint for reading budgets
 * - 10.6: Organization-based access control
 */
router.get(
  "/:id",
  validate(budgetIdSchema),
  BudgetController.getBudget
);

/**
 * PUT /api/budgets/:id - Update a budget
 * 
 * Requirements:
 * - 10.1: REST API endpoint for updating budgets
 * - 10.6: Organization-based access control
 * - 10.7: Input validation using DTOs
 */
router.put(
  "/:id",
  validate(budgetIdSchema),
  validate(updateBudgetSchema),
  BudgetController.updateBudget
);

/**
 * DELETE /api/budgets/:id - Delete or archive a budget
 * 
 * Requirements:
 * - 10.1: REST API endpoint for deleting budgets
 * - 10.6: Organization-based access control
 */
router.delete(
  "/:id",
  validate(budgetIdSchema),
  BudgetController.deleteBudget
);

/**
 * POST /api/budgets/:id/alerts - Configure alerts for a budget
 * 
 * Requirements:
 * - 10.2: REST API endpoint for configuring alerts
 * - 10.6: Organization-based access control
 * - 10.7: Input validation using DTOs
 */
router.post(
  "/:id/alerts",
  validate(budgetIdSchema),
  validate(configureAlertsSchema),
  BudgetController.configureAlerts
);

/**
 * PUT /api/alerts/:id - Update an alert
 * 
 * Requirements:
 * - 10.2: REST API endpoint for updating alerts
 * - 10.6: Organization-based access control
 * - 10.7: Input validation using DTOs
 */
router.put(
  "/alerts/:id",
  validate(alertIdSchema),
  validate(updateAlertSchema),
  BudgetController.updateAlert
);

/**
 * DELETE /api/alerts/:id - Delete an alert
 * 
 * Requirements:
 * - 10.2: REST API endpoint for deleting alerts
 * - 10.6: Organization-based access control
 */
router.delete(
  "/alerts/:id",
  validate(alertIdSchema),
  BudgetController.deleteAlert
);

export default router;
