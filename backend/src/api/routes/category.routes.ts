import { Router } from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/categories - Get all categories
router.get("/", CategoryController.getCategories);

// GET /api/categories/summary - Get categories summary
router.get("/summary", CategoryController.getCategorySummary);

// GET /api/categories/defaults - Get default categories
router.get("/defaults", CategoryController.getDefaultCategories);

// POST /api/categories/defaults - Create default categories
router.post("/defaults", CategoryController.createDefaultCategories);

// GET /api/categories/type/:type - Get categories by type
router.get("/type/:type", CategoryController.getCategoriesByType);

// GET /api/categories/:id - Get specific category
router.get("/:id", CategoryController.getCategoryById);

export default router;