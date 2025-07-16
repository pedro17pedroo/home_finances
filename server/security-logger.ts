import { db } from "./db";
import { securityLogs, blockedIPs } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface SecurityEvent {
  eventType: 'failed_login' | 'brute_force' | 'suspicious_activity' | 'ip_blocked' | 'password_attempt' | 'account_locked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
  details?: any;
}

// Track failed login attempts per IP
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export const logSecurityEvent = async (event: SecurityEvent) => {
  try {
    await db.insert(securityLogs).values({
      eventType: event.eventType,
      severity: event.severity,
      description: event.description,
      ipAddress: event.ipAddress,
      location: event.location,
      userAgent: event.userAgent,
      details: event.details,
    });

    console.log(`Security event logged: ${event.eventType} - ${event.severity} - ${event.description}`);
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
};

export const trackFailedLogin = async (ipAddress: string, userAgent?: string, email?: string) => {
  const now = new Date();
  const key = ipAddress;
  
  // Get current attempts for this IP
  const current = loginAttempts.get(key) || { count: 0, lastAttempt: now };
  
  // Reset count if last attempt was more than 1 hour ago
  if (now.getTime() - current.lastAttempt.getTime() > 60 * 60 * 1000) {
    current.count = 0;
  }
  
  current.count++;
  current.lastAttempt = now;
  loginAttempts.set(key, current);

  // Log the failed login attempt
  await logSecurityEvent({
    eventType: 'failed_login',
    severity: current.count > 10 ? 'high' : current.count > 5 ? 'medium' : 'low',
    description: `Tentativa de login falhada${email ? ` para ${email}` : ''}`,
    ipAddress,
    userAgent,
    details: {
      attemptCount: current.count,
      email,
      timestamp: now.toISOString()
    }
  });

  // Check for brute force attack (more than 15 attempts in 1 hour)
  if (current.count >= 15) {
    await logSecurityEvent({
      eventType: 'brute_force',
      severity: 'critical',
      description: `Ataque de força bruta detectado - ${current.count} tentativas em 1 hora`,
      ipAddress,
      userAgent,
      details: {
        attemptCount: current.count,
        email,
        timeWindow: '1 hour'
      }
    });

    // Auto-block IP after brute force detection
    await blockIP(ipAddress, 'Ataque de força bruta detectado', null);
  }

  return current.count;
};

export const blockIP = async (ipAddress: string, reason: string, blockedBy: number | null) => {
  try {
    // Check if IP is already blocked
    const existingBlock = await db.select()
      .from(blockedIPs)
      .where(and(
        eq(blockedIPs.ipAddress, ipAddress),
        eq(blockedIPs.isActive, true)
      ));

    if (existingBlock.length === 0) {
      await db.insert(blockedIPs).values({
        ipAddress,
        reason,
        blockedBy,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      await logSecurityEvent({
        eventType: 'ip_blocked',
        severity: 'high',
        description: `IP ${ipAddress} foi bloqueado: ${reason}`,
        ipAddress,
        details: {
          reason,
          blockedBy,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }
  } catch (error) {
    console.error("Failed to block IP:", error);
  }
};

export const isIPBlocked = async (ipAddress: string): Promise<boolean> => {
  try {
    const blockedIP = await db.select()
      .from(blockedIPs)
      .where(and(
        eq(blockedIPs.ipAddress, ipAddress),
        eq(blockedIPs.isActive, true)
      ));

    return blockedIP.length > 0;
  } catch (error) {
    console.error("Failed to check IP block status:", error);
    return false;
  }
};

export const getSecurityStats = async () => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count failed logins in last 24 hours
    const failedLogins = await db.select()
      .from(securityLogs)
      .where(and(
        eq(securityLogs.eventType, 'failed_login'),
        // Note: Add timestamp filter when we have proper date functions
      ));

    // Count blocked IPs
    const blockedIPCount = await db.select()
      .from(blockedIPs)
      .where(eq(blockedIPs.isActive, true));

    // Count critical events in last 24h
    const criticalEvents = await db.select()
      .from(securityLogs)
      .where(eq(securityLogs.severity, 'critical'));

    // Get recent blocked IPs
    const recentBlockedIPs = await db.select()
      .from(blockedIPs)
      .where(eq(blockedIPs.isActive, true))
      .orderBy(blockedIPs.createdAt)
      .limit(5);

    return {
      failedLogins24h: failedLogins.length,
      blockedIPs: blockedIPCount.length,
      attacks24h: criticalEvents.length,
      securityScore: Math.max(0, 100 - (failedLogins.length * 2) - (criticalEvents.length * 10)),
      recentBlockedIPs: recentBlockedIPs.map(ip => ({
        address: ip.ipAddress,
        blockedAt: ip.createdAt,
        reason: ip.reason
      }))
    };
  } catch (error) {
    console.error("Failed to get security stats:", error);
    return {
      failedLogins24h: 0,
      blockedIPs: 0,
      attacks24h: 0,
      securityScore: 100,
      recentBlockedIPs: []
    };
  }
};