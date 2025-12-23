import { Router } from "express";
import { AdvancedReportsController } from "../controllers/advanced-reports.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { organizationContext } from "../middlewares/organization.js";

const router = Router();

// Todas as rotas requerem autenticação e contexto de organização
router.use(authenticate);
router.use(organizationContext);

// GET /api/advanced-reports/financial-overview - Visão geral financeira
router.get("/financial-overview", AdvancedReportsController.getFinancialOverview);

// GET /api/advanced-reports/cash-flow - Análise de fluxo de caixa
router.get("/cash-flow", AdvancedReportsController.getCashFlowAnalysis);

// GET /api/advanced-reports/debt-analysis - Análise de dívidas
router.get("/debt-analysis", AdvancedReportsController.getDebtAnalysis);

// GET /api/advanced-reports/period-comparison - Comparação entre períodos
router.get("/period-comparison", AdvancedReportsController.getPeriodComparison);

export default router;