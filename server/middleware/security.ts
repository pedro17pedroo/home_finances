import { Request, Response, NextFunction } from 'express';
import { db } from "../db";
import { blockedIPs, securityLogs } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";

// Rate limiting and security middleware
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function checkBlockedIP(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const [blocked] = await db.select().from(blockedIPs).where(
      and(
        eq(blockedIPs.ipAddress, clientIP),
        gte(blockedIPs.expiresAt, new Date())
      )
    );

    if (blocked) {
      await logSecurityEvent(clientIP, 'ip_blocked', 'critical', {
        reason: blocked.reason,
        blockedUntil: blocked.expiresAt
      }, req.get('User-Agent'));

      return res.status(403).json({ 
        message: "Access denied",
        reason: "IP blocked due to security violations"
      });
    }

    next();
  } catch (error) {
    console.error('Error checking blocked IP:', error);
    next();
  }
}

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = loginAttempts.get(clientIP);

  if (attempts) {
    // Reset attempts if lockout period has passed
    if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
      loginAttempts.delete(clientIP);
    } else if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      logSecurityEvent(clientIP, 'brute_force', 'high', {
        attempts: attempts.count,
        lockoutDuration: LOCKOUT_DURATION
      }, req.get('User-Agent'));

      return res.status(429).json({
        message: "Too many login attempts",
        lockoutUntil: new Date(attempts.lastAttempt + LOCKOUT_DURATION)
      });
    }
  }

  next();
}

export function trackLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
  } else {
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
  }
}

export async function logSecurityEvent(
  ipAddress: string,
  eventType: string,
  severity: string,
  details: any,
  userAgent?: string
) {
  try {
    await db.insert(securityLogs).values({
      eventType: eventType as any,
      severity: severity as any,
      details,
      userAgent,
      ipAddress,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export async function blockIP(ipAddress: string, reason: string, durationHours: number = 24) {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  
  try {
    await db.insert(blockedIPs).values({
      ipAddress,
      reason,
      expiresAt,
      createdAt: new Date()
    }).onConflictDoUpdate({
      target: blockedIPs.ipAddress,
      set: {
        reason,
        expiresAt,
        createdAt: new Date()
      }
    });

    await logSecurityEvent(ipAddress, 'ip_blocked', 'critical', {
      reason,
      durationHours,
      expiresAt
    });
  } catch (error) {
    console.error('Failed to block IP:', error);
  }
}