import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/notifications - Listar todas as notificações
router.get("/", NotificationController.getAll);

// GET /api/notifications/unread-count - Contagem de não lidas
router.get("/unread-count", NotificationController.getUnreadCount);

// POST /api/notifications/:id/read - Marcar como lida
router.post("/:id/read", NotificationController.markAsRead);

// POST /api/notifications/read-all - Marcar todas como lidas
router.post("/read-all", NotificationController.markAllAsRead);

// DELETE /api/notifications/:id - Excluir notificação
router.delete("/:id", NotificationController.deleteNotification);

export default router;