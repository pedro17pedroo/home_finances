import { Router } from "express";
import { ExportController } from "../controllers/export.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// POST /api/export/data - Exportar dados personalizados
router.post("/data", ExportController.exportData);

// GET /api/export/backup - Criar backup completo
router.get("/backup", ExportController.createBackup);

// GET /api/export/transactions - Exportar transações em CSV
router.get("/transactions", ExportController.exportTransactions);

// GET /api/export/summary - Gerar relatório de resumo
router.get("/summary", ExportController.generateSummaryReport);

// GET /api/export/pdf - Gerar relatório em PDF
router.get("/pdf", ExportController.generatePDFReport);

export default router;