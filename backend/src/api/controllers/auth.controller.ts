import { Request, Response, NextFunction } from "express";
import { AuthService } from "../../domain/services/auth.service.js";

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      
      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      
      res.status(201).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getCurrentUser(userId);
      
      res.json({
        status: "success",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await AuthService.updateProfile(userId, req.body);
      
      res.json({
        status: "success",
        data: { user },
        message: "Profile updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      
      const result = await AuthService.changePassword(
        userId,
        currentPassword,
        newPassword
      );
      
      res.json({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}