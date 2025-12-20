import { eq, or } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { users, type User, type InsertUser } from "../../core/database/schema.js";

export class UserRepository {
  static async findById(id: number): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByPhone(phone: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, emailOrPhone),
          eq(users.phone, emailOrPhone)
        )
      )
      .limit(1);
    
    return result[0] || null;
  }

  static async create(userData: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  static async update(id: number, userData: Partial<InsertUser>): Promise<User> {
    const result = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  static async updateSubscription(
    id: number,
    subscriptionStatus: string,
    planType: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<User> {
    const updateData: any = {
      subscriptionStatus,
      planType,
      updatedAt: new Date(),
    };

    if (stripeCustomerId) {
      updateData.stripeCustomerId = stripeCustomerId;
    }

    if (stripeSubscriptionId) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }
}