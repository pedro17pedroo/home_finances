import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { verifyPassword } from '../middleware/auth';
import { db } from '../db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import { logAdminAction } from '../middleware/adminAuth';

export class AdminController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));

      if (!admin || !admin.isActive || !(await verifyPassword(password, admin.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await db.update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, admin.id));

      req.session.adminUserId = admin.id;

      const { password: _, ...adminWithoutPassword } = admin;
      res.json({ admin: adminWithoutPassword });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async logout(req: Request, res: Response) {
    req.session.adminUserId = undefined;
    res.json({ message: "Logged out successfully" });
  }

  static async getCurrentAdmin(req: Request, res: Response) {
    try {
      const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.admin.id));
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const { password: _, ...adminWithoutPassword } = admin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error('Get current admin error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getDashboardMetrics(req: Request, res: Response) {
    try {
      const stats = await UserModel.getStats();
      res.json({
        totalUsers: stats.total,
        activeUsers: stats.active,
        monthlyRevenue: 0, // TODO: Calculate from payments
        trialConversionRate: 0, // TODO: Calculate conversion rate
        churnRate: 0, // TODO: Calculate churn rate
        planDistribution: stats.planDistribution
      });
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, search, status } = req.query;
      
      let users = await UserModel.getAll(
        parseInt(page as string), 
        parseInt(limit as string)
      );

      // Apply filters if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        users.users = users.users.filter(user => 
          user.email?.toLowerCase().includes(searchTerm) ||
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm)
        );
      }

      if (status && status !== 'all') {
        users.users = users.users.filter(user => user.subscriptionStatus === status);
      }

      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { email, phone, firstName, lastName, planType, password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Check if user already exists
      if (email) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists with this email" });
        }
      }

      if (phone) {
        const existingUser = await UserModel.findByPhone(phone);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists with this phone" });
        }
      }

      const newUser = await UserModel.create({
        email: email || undefined,
        phone: phone || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        password,
        planType: planType || 'basic'
      });

      // Log the action
      await logAdminAction(
        req.admin.id, 
        'create_user', 
        'user', 
        newUser.id, 
        null, 
        { email, firstName, lastName, planType },
        req.ip,
        req.get('User-Agent')
      );

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email, phone, firstName, lastName, planType, subscriptionStatus } = req.body;

      const existingUser = await UserModel.findById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await UserModel.update(parseInt(id), {
        email: email || undefined,
        phone: phone || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        planType,
        subscriptionStatus
      });

      // Log the action
      await logAdminAction(
        req.admin.id,
        'update_user',
        'user',
        parseInt(id),
        existingUser,
        updatedUser,
        req.ip,
        req.get('User-Agent')
      );

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingUser = await UserModel.findById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await UserModel.delete(parseInt(id));

      // Log the action
      await logAdminAction(
        req.admin.id,
        'delete_user',
        'user',
        parseInt(id),
        existingUser,
        null,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}