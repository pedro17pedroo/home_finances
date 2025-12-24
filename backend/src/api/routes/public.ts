import { Router } from "express";
import { PublicController } from "../controllers/public.controller.js";

const router = Router();

// Todas as rotas são públicas (sem autenticação)

// Landing page content
router.get("/landing", PublicController.getLandingContent);

// Public plans
router.get("/plans", PublicController.getPublicPlans);

// Legal content
router.get("/legal/:type", PublicController.getLegalContent);

// FAQ
router.get("/faq", PublicController.getFaq);

// Contact form
router.post("/contact", PublicController.submitContact);

// Public stats
router.get("/stats", PublicController.getPublicStats);

export default router;