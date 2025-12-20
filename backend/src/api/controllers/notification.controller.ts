import { Request, Response, NextFunction } from "express";
import { NotificationService } from "../../domain/services/notification.service.js";

export class NotificationController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifications = await NotificationService.getNotificationsForUser(userId);
      
      res.json({
        status: "success",
        data: { notifications }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const count = await NotificationService.getUnreadCount(userId);
      
      res.json({
        status: "success",
        data: { count }
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.id;
      
      await NotificationService.markAsRead(userId, notificationId);
      
      res.json({
        status: "success",
        message: "Notificação marcada como lida"
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      
      await NotificationService.markAllAsRead(userId);
      
      res.json({
        status: "success",
        message: "Todas as notificações marcadas como lidas"
      });
    } catch (error) {
      next(error);
    }
  }
}