import { Router } from "express";
import { WhatsAppController } from "../controllers/whatsapp.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Webhook routes (públicas - para WhatsApp Business API)
router.get("/webhook", WhatsAppController.verifyWebhook);
router.post("/webhook", WhatsAppController.receiveMessage);

// Admin routes (protegidas)
router.use(authenticate);

// Enviar mensagem (para testes/admin)
router.post("/send", WhatsAppController.sendMessage);

// Status do bot
router.get("/status", WhatsAppController.getBotStatus);

// Simular mensagem (para testes)
router.post("/simulate", WhatsAppController.simulateMessage);

export default router;