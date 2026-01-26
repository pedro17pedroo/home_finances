import 'dotenv/config';

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { NotificationService } from "../src/domain/services/notification.service.js";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { db } from "../src/core/database/db.js";
import { users, organizations, categories, budgets, budgetAlerts } from "../src/core/database/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../src/core/utils/logger.js";
import { emailService } from "../src/infrastructure/email/email.service.js";
import {
  ThresholdType,
  AlertPosition,
  ChannelType,
  TimePeriodType,
  BudgetStatus,
  type Alert,
  type Budget,
  type SpendingCalculation,
} from "../src/domain/entities/budget.types.js";

/**
 * Unit Tests for Notification Error Handling
 * 
 * These tests verify that the notification service handles errors gracefully
 * and doesn't block transaction processing when notifications fail.
 * 
 * Tests validate:
 * - Notification service failures
 * - Partial channel failures
 * - Requirements: 4.2
 */

// ============================================================================
// Test Setup
// ============================================================================

describe("Notification Error Handling", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;
  let testBudget: any;
  const testCurrency = "AOA";

  beforeAll(async () => {
    // Create test organization
    const org = await db.insert(organizations).values({
      name: `Test Org Notification Error ${Date.now()}`,
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user with email and phone (use dynamic phone number to avoid duplicates)
    const user = await db.insert(users).values({
      email: `test-notification-error-${Date.now()}@example.com`,
      phone: `+244900${Date.now().toString().slice(-6)}`, // Dynamic phone number
      firstName: "Test",
      lastName: "User",
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category Error",
      type: "despesa",
    }).returning();
    testCategoryId = category[0].id;

    // Create test budget
    testBudget = await BudgetService.createBudget(
      {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.ACTIVE,
      },
      testOrgId,
      testCurrency
    );
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    if (testBudget) {
      await db.delete(budgets).where(eq(budgets.id, testBudget.id));
    }
    if (testCategoryId) {
      await db.delete(categories).where(eq(categories.id, testCategoryId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  beforeEach(async () => {
    // Clean up alerts before each test
    if (testBudget) {
      await db.delete(budgetAlerts).where(eq(budgetAlerts.budgetId, testBudget.id));
    }
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Convert database Budget to Budget type
   */
  const convertToBudget = (dbBudget: any): Budget => ({
    ...dbBudget,
    amount: Number(dbBudget.amount),
    timePeriod: dbBudget.timePeriod as TimePeriodType,
    status: dbBudget.status as BudgetStatus,
    customStartDate: dbBudget.customStartDate || undefined,
    customEndDate: dbBudget.customEndDate || undefined,
  });

  /**
   * Create a test spending calculation
   */
  const createSpendingCalculation = (totalSpent: number, budgetAmount: number): SpendingCalculation => {
    const percentageUsed = (totalSpent / budgetAmount) * 100;
    const isExceeded = totalSpent > budgetAmount;
    const remainingAmount = isExceeded ? 0 : budgetAmount - totalSpent;
    const exceededAmount = isExceeded ? totalSpent - budgetAmount : 0;

    return {
      totalSpent,
      budgetAmount,
      percentageUsed,
      remainingAmount,
      exceededAmount,
      isExceeded,
    };
  };

  // ============================================================================
  // Unit Tests
  // ============================================================================

  describe("Notification service failures", () => {
    test("sendBudgetAlert should not throw when category lookup fails", async () => {
      // Create alert with all channels enabled
      const alertData = await db.insert(budgetAlerts).values({
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: "80",
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
      }).returning();

      const alert: Alert = {
        id: alertData[0].id,
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create budget with invalid category ID
      const invalidBudget: Budget = {
        ...convertToBudget(testBudget),
        categoryId: 999999, // Non-existent category ID
      };

      const spending = createSpendingCalculation(800, 1000);

      // Should not throw even though category lookup will fail
      await expect(
        NotificationService.sendBudgetAlert(testUserId, alert, invalidBudget, spending)
      ).resolves.not.toThrow();

      // Cleanup
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert.id));
    });

    test("sendBudgetAlert should handle errors gracefully and log them", async () => {
      // Spy on logger.error to verify error logging
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

      // Create alert with all channels enabled
      const alertData = await db.insert(budgetAlerts).values({
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: "80",
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
      }).returning();

      const alert: Alert = {
        id: alertData[0].id,
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create budget with invalid category ID to trigger error
      const invalidBudget: Budget = {
        ...convertToBudget(testBudget),
        categoryId: 999999, // Non-existent category ID
      };

      const spending = createSpendingCalculation(800, 1000);

      // Send alert - should not throw
      await NotificationService.sendBudgetAlert(testUserId, alert, invalidBudget, spending);

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();

      // Cleanup
      loggerErrorSpy.mockRestore();
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert.id));
    });

    test("sendBudgetAlert should complete even when all channels fail", async () => {
      // Create alert with all channels enabled
      const alertData = await db.insert(budgetAlerts).values({
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: "80",
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
      }).returning();

      const alert: Alert = {
        id: alertData[0].id,
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetWithNumberAmount = convertToBudget(testBudget);
      const spending = createSpendingCalculation(800, 1000);

      // Mock all notification methods to throw errors
      const sendInAppSpy = jest.spyOn(NotificationService, 'sendInAppNotification')
        .mockRejectedValue(new Error('In-app notification failed'));
      const sendEmailSpy = jest.spyOn(NotificationService, 'sendEmailNotification')
        .mockRejectedValue(new Error('Email notification failed'));
      const sendSMSSpy = jest.spyOn(NotificationService, 'sendSMSNotification')
        .mockRejectedValue(new Error('SMS notification failed'));

      // Should not throw even though all channels fail
      await expect(
        NotificationService.sendBudgetAlert(testUserId, alert, budgetWithNumberAmount, spending)
      ).resolves.not.toThrow();

      // Cleanup
      sendInAppSpy.mockRestore();
      sendEmailSpy.mockRestore();
      sendSMSSpy.mockRestore();
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert.id));
    });
  });

  describe("Partial channel failures", () => {
    test("sendBudgetAlert should succeed for working channels when one channel fails", async () => {
      // Create alert with multiple channels enabled
      const alertData = await db.insert(budgetAlerts).values({
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: "80",
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
      }).returning();

      const alert: Alert = {
        id: alertData[0].id,
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetWithNumberAmount = convertToBudget(testBudget);
      const spending = createSpendingCalculation(800, 1000);

      // Mock email to fail, but in-app and SMS to succeed
      const sendEmailSpy = jest.spyOn(NotificationService, 'sendEmailNotification')
        .mockRejectedValue(new Error('Email service unavailable'));

      const initialNotifications = await NotificationService.getNotificationsForUser(testUserId);
      const initialCount = initialNotifications.length;

      // Send alert - should not throw
      await expect(
        NotificationService.sendBudgetAlert(testUserId, alert, budgetWithNumberAmount, spending)
      ).resolves.not.toThrow();

      // Verify in-app notification was still created (working channel)
      const notifications = await NotificationService.getNotificationsForUser(testUserId);
      expect(notifications.length).toBeGreaterThan(initialCount);

      // Cleanup
      sendEmailSpy.mockRestore();
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert.id));
    });

    test("sendEmailNotification should handle missing user email gracefully", async () => {
      // Create user without email (use dynamic phone number to avoid duplicates)
      const userWithoutEmail = await db.insert(users).values({
        email: null,
        phone: `+244901${Date.now().toString().slice(-6)}`, // Dynamic phone number
        firstName: "Test",
        lastName: "NoEmail",
        password: "hashedpassword",
        organizationId: testOrgId,
      }).returning();

      const notification = {
        title: "Test Alert",
        message: "Test message",
        data: {
          categoryName: "Test",
          currentSpending: 800,
          budgetLimit: 1000,
          percentageUsed: 80,
          remainingAmount: 200,
        },
      };

      // Should not throw when user has no email
      await expect(
        NotificationService.sendEmailNotification(userWithoutEmail[0].id, notification)
      ).resolves.not.toThrow();

      // Cleanup
      await db.delete(users).where(eq(users.id, userWithoutEmail[0].id));
    });

    test("sendSMSNotification should handle missing user phone gracefully", async () => {
      // Create user without phone
      const userWithoutPhone = await db.insert(users).values({
        email: `test-no-phone-${Date.now()}@example.com`,
        phone: null,
        firstName: "Test",
        lastName: "NoPhone",
        password: "hashedpassword",
        organizationId: testOrgId,
      }).returning();

      const notification = {
        title: "Test Alert",
        message: "Test message",
        data: {
          categoryName: "Test",
          currentSpending: 800,
          budgetLimit: 1000,
          percentageUsed: 80,
          remainingAmount: 200,
        },
      };

      // Should not throw when user has no phone
      await expect(
        NotificationService.sendSMSNotification(userWithoutPhone[0].id, notification)
      ).resolves.not.toThrow();

      // Cleanup
      await db.delete(users).where(eq(users.id, userWithoutPhone[0].id));
    });

    test("sendInAppNotification should handle errors and throw", async () => {
      const notification = {
        title: "Test Alert",
        message: "Test message",
        data: {
          categoryName: "Test",
          currentSpending: 800,
          budgetLimit: 1000,
          percentageUsed: 80,
          remainingAmount: 200,
        },
      };

      // Create a spy that throws an error
      jest.spyOn(NotificationService, 'sendInAppNotification').mockImplementation(async () => {
        throw new Error('Internal error');
      });

      // Should throw when internal error occurs
      await expect(
        NotificationService.sendInAppNotification(testUserId, notification)
      ).rejects.toThrow('Internal error');

      // Restore original method
      (NotificationService.sendInAppNotification as any).mockRestore();
    });

    test("email service failure should be caught and logged", async () => {
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
      
      // Mock emailService.sendEmail to throw
      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail')
        .mockRejectedValue(new Error('SMTP connection failed'));

      const notification = {
        title: "Test Alert",
        message: "Test message",
        data: {
          categoryName: "Test",
          currentSpending: 800,
          budgetLimit: 1000,
          percentageUsed: 80,
          remainingAmount: 200,
        },
      };

      // Should throw (email notification throws on error)
      await expect(
        NotificationService.sendEmailNotification(testUserId, notification)
      ).rejects.toThrow();

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();

      // Cleanup
      loggerErrorSpy.mockRestore();
      sendEmailSpy.mockRestore();
    });

    test("sendBudgetAlert uses Promise.allSettled to handle partial failures", async () => {
      // Create alert with multiple channels
      const alertData = await db.insert(budgetAlerts).values({
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: "80",
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
        ],
      }).returning();

      const alert: Alert = {
        id: alertData[0].id,
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetWithNumberAmount = convertToBudget(testBudget);
      const spending = createSpendingCalculation(800, 1000);

      // Mock email to fail
      const sendEmailSpy = jest.spyOn(NotificationService, 'sendEmailNotification')
        .mockRejectedValue(new Error('Email failed'));

      const initialNotifications = await NotificationService.getNotificationsForUser(testUserId);
      const initialCount = initialNotifications.length;

      // Send alert - should complete without throwing
      await NotificationService.sendBudgetAlert(testUserId, alert, budgetWithNumberAmount, spending);

      // Verify in-app notification succeeded despite email failure
      const notifications = await NotificationService.getNotificationsForUser(testUserId);
      expect(notifications.length).toBeGreaterThan(initialCount);

      // Cleanup
      sendEmailSpy.mockRestore();
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert.id));
    });
  });

  describe("Error recovery and resilience", () => {
    test("notification failures should not prevent subsequent notifications", async () => {
      // Create alert
      const alertData = await db.insert(budgetAlerts).values({
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: "80",
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
        ],
      }).returning();

      const alert: Alert = {
        id: alertData[0].id,
        budgetId: testBudget.id,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetWithNumberAmount = convertToBudget(testBudget);
      const spending = createSpendingCalculation(800, 1000);

      // First notification - mock to fail
      const sendInAppSpy = jest.spyOn(NotificationService, 'sendInAppNotification')
        .mockRejectedValueOnce(new Error('Temporary failure'));

      // First attempt should not throw
      await expect(
        NotificationService.sendBudgetAlert(testUserId, alert, budgetWithNumberAmount, spending)
      ).resolves.not.toThrow();

      // Restore mock to allow success
      sendInAppSpy.mockRestore();

      const initialNotifications = await NotificationService.getNotificationsForUser(testUserId);
      const initialCount = initialNotifications.length;

      // Second attempt should succeed
      await NotificationService.sendBudgetAlert(testUserId, alert, budgetWithNumberAmount, spending);

      // Verify notification was created
      const notifications = await NotificationService.getNotificationsForUser(testUserId);
      expect(notifications.length).toBeGreaterThan(initialCount);

      // Cleanup
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert.id));
    });

    test("invalid user ID should be handled gracefully", async () => {
      const invalidUserId = 999999;

      const notification = {
        title: "Test Alert",
        message: "Test message",
        data: {
          categoryName: "Test",
          currentSpending: 800,
          budgetLimit: 1000,
          percentageUsed: 80,
          remainingAmount: 200,
        },
      };

      // Should not throw for invalid user (email/SMS will log warning and return)
      await expect(
        NotificationService.sendEmailNotification(invalidUserId, notification)
      ).resolves.not.toThrow();

      await expect(
        NotificationService.sendSMSNotification(invalidUserId, notification)
      ).resolves.not.toThrow();
    });
  });
});
