import { eq, and } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { 
  organizationMemberships, 
  organizations,
  users,
  type OrganizationMembership, 
  type InsertOrganizationMembership 
} from "../../core/database/schema.js";

export interface MembershipWithDetails extends OrganizationMembership {
  organization?: {
    id: number;
    name: string;
    planType: string | null;
    subscriptionStatus: string | null;
  };
  user?: {
    id: number;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export class OrganizationMembershipRepository {
  /**
   * Find all memberships for a user
   */
  static async findByUserId(userId: number): Promise<MembershipWithDetails[]> {
    const result = await db
      .select({
        id: organizationMemberships.id,
        userId: organizationMemberships.userId,
        organizationId: organizationMemberships.organizationId,
        role: organizationMemberships.role,
        joinedAt: organizationMemberships.joinedAt,
        invitedBy: organizationMemberships.invitedBy,
        createdAt: organizationMemberships.createdAt,
        updatedAt: organizationMemberships.updatedAt,
        organization: {
          id: organizations.id,
          name: organizations.name,
          planType: organizations.planType,
          subscriptionStatus: organizations.subscriptionStatus,
        },
      })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
      .where(eq(organizationMemberships.userId, userId));

    return result;
  }

  /**
   * Find all memberships for an organization
   */
  static async findByOrganizationId(organizationId: number): Promise<MembershipWithDetails[]> {
    const result = await db
      .select({
        id: organizationMemberships.id,
        userId: organizationMemberships.userId,
        organizationId: organizationMemberships.organizationId,
        role: organizationMemberships.role,
        joinedAt: organizationMemberships.joinedAt,
        invitedBy: organizationMemberships.invitedBy,
        createdAt: organizationMemberships.createdAt,
        updatedAt: organizationMemberships.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(eq(organizationMemberships.organizationId, organizationId));

    return result;
  }

  /**
   * Find a specific membership by user and organization
   */
  static async findByUserAndOrg(userId: number, organizationId: number): Promise<OrganizationMembership | null> {
    const result = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find membership by ID
   */
  static async findById(id: number): Promise<OrganizationMembership | null> {
    const result = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new membership
   */
  static async create(data: InsertOrganizationMembership): Promise<OrganizationMembership> {
    const result = await db
      .insert(organizationMemberships)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Update a membership
   */
  static async update(id: number, data: Partial<InsertOrganizationMembership>): Promise<OrganizationMembership> {
    const result = await db
      .update(organizationMemberships)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizationMemberships.id, id))
      .returning();

    return result[0];
  }

  /**
   * Delete a membership by ID
   */
  static async delete(id: number): Promise<void> {
    await db
      .delete(organizationMemberships)
      .where(eq(organizationMemberships.id, id));
  }

  /**
   * Delete a membership by user and organization
   */
  static async deleteByUserAndOrg(userId: number, organizationId: number): Promise<void> {
    await db
      .delete(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      );
  }

  /**
   * Count memberships for an organization
   */
  static async countByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, organizationId));

    return result.length;
  }

  /**
   * Count memberships for a user
   */
  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId));

    return result.length;
  }
}
