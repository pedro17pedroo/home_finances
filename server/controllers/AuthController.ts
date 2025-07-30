import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { verifyPassword } from '../middleware/auth';
import { trackLoginAttempt, logSecurityEvent } from '../middleware/security';
import { insertUserSchema } from '@shared/schema';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, phone, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!password || (!email && !phone)) {
        await logSecurityEvent(clientIP, 'failed_login', 'medium', {
          reason: 'Invalid credentials format',
          email: email ? '[PROVIDED]' : '[NOT PROVIDED]',
          phone: phone ? '[PROVIDED]' : '[NOT PROVIDED]'
        }, req.get('User-Agent'));

        trackLoginAttempt(clientIP, false);
        return res.status(400).json({ message: "Email/phone and password are required" });
      }

      let user;
      if (email) {
        user = await UserModel.findByEmail(email);
      } else {
        user = await UserModel.findByPhone(phone);
      }

      if (!user || !(await verifyPassword(password, user.password))) {
        await logSecurityEvent(clientIP, 'failed_login', 'medium', {
          reason: 'Invalid credentials',
          identifier: email || phone,
          userFound: !!user
        }, req.get('User-Agent'));

        trackLoginAttempt(clientIP, false);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      trackLoginAttempt(clientIP, true);
      req.session.userId = user.id;

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.errors 
        });
      }

      const { email, phone, password, firstName, lastName, planType } = validation.data;

      // Check if user already exists
      if (email) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      if (phone) {
        const existingUser = await UserModel.findByPhone(phone);
        if (existingUser) {
          return res.status(400).json({ message: "Phone already registered" });
        }
      }

      const user = await UserModel.create({
        email: email || undefined,
        phone: phone || undefined,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        planType: planType || 'basic'
      });

      req.session.userId = user.id;

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async logout(req: Request, res: Response) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  }

  static async getCurrentUser(req: Request, res: Response) {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await UserModel.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, phone } = req.body;
      
      const user = await UserModel.update(req.user.id, {
        firstName,
        lastName,
        email,
        phone
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}