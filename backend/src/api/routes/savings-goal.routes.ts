import { Router } from "express";
import { SavingsGoalController } from "../controllers/savings-goal.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { 
  createSavingsGoalSchema, 
  updateSavingsGoalSchema,
  addToGoalSchema,
  savingsGoalIdSchema 
} from "../validators/savings-goal.validator.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/savings-goals - Get all user savings goals
router.get("/", SavingsGoalController.getSavingsGoals);

// GET /api/savings-goals/summary - Get savings goals summary
router.get("/summary", SavingsGoalController.getSavingsGoalsSummary);

// GET /api/savings-goals/:id - Get specific savings goal
router.get("/:id", 
  validate(savingsGoalIdSchema), 
  SavingsGoalController.getSavingsGoalById
);

// GET /api/savings-goals/:id/progress - Get goal progress
router.get("/:id/progress", 
  validate(savingsGoalIdSchema), 
  SavingsGoalController.getGoalProgress
);

// POST /api/savings-goals - Create new savings goal
router.post("/", 
  validate(createSavingsGoalSchema), 
  SavingsGoalController.createSavingsGoal
);

// POST /api/savings-goals/:id/add - Add amount to savings goal
router.post("/:id/add", 
  validate(savingsGoalIdSchema),
  validate(addToGoalSchema), 
  SavingsGoalController.addToSavingsGoal
);

// PUT /api/savings-goals/:id - Update savings goal
router.put("/:id", 
  validate(savingsGoalIdSchema),
  validate(updateSavingsGoalSchema), 
  SavingsGoalController.updateSavingsGoal
);

// DELETE /api/savings-goals/:id - Delete savings goal
router.delete("/:id", 
  validate(savingsGoalIdSchema), 
  SavingsGoalController.deleteSavingsGoal
);

export default router;