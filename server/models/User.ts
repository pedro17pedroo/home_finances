import { db } from "../db";
import { users, insertUserSchema, type User } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "../middleware/auth";

export class UserModel {
  static async create(userData: {
    email?: string;
    phone?: string;
    password: string;
    firstName?: string;
    lastName?: string;
    planType?: 'basic' | 'premium' | 'enterprise';
  }) {
    const hashedPassword = await hashPassword(userData.password);
    
    const [user] = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
    }).returning();

    return user;
  }

  static async findById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  static async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  static async findByPhone(phone: string) {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  static async update(id: number, updates: Partial<User>) {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  static async delete(id: number) {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  static async getAll(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    
    const usersList = await db.select().from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);

    return {
      users: usersList,
      total: Number(count),
      page,
      totalPages: Math.ceil(Number(count) / limit)
    };
  }

  static async getStats() {
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [activeUsers] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.subscriptionStatus, 'active'));
    
    const planDistribution = await db.select({
      planType: users.planType,
      count: sql<number>`count(*)`
    }).from(users).groupBy(users.planType);

    return {
      total: Number(totalUsers.count),
      active: Number(activeUsers.count),
      planDistribution: planDistribution.reduce((acc, row) => {
        if (row.planType) {
          acc[row.planType] = Number(row.count);
        }
        return acc;
      }, {} as Record<string, number>)
    };
  }

  static async updateSubscription(id: number, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
    planType?: 'basic' | 'premium' | 'enterprise';
  }) {
    return this.update(id, subscriptionData);
  }
}