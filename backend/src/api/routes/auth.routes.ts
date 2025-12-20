import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

// Public routes
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/register", validate(registerSchema), AuthController.register);

// Protected routes
router.use(authenticate);
router.get("/me", AuthController.getCurrentUser);
router.put("/profile", validate(updateProfileSchema), AuthController.updateProfile);
router.put("/change-password", validate(changePasswordSchema), AuthController.changePassword);

export default router;