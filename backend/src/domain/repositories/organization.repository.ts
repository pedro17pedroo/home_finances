import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { 
  organizations, 
  teamInvitations, 
  users,
  type Organization, 
  type InsertOrganization,
  type TeamInvitation,
  type InsertTeamInvitation,
  type User
} from "../../core/database/schema.js";

export class OrganizationRepository {
  // Organization methods
  static async findById(id: number): Promise<Organization | null> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByOwnerId(ownerId: number): Promise<Organization | null> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, ownerId))
      .limit(1);
    
    return result[0] || null;
  }

  static async create(data: InsertOrganization): Promise<Organization> {
    const result = await db
      .insert(organizations)
      .values(data)
      .returning();
    
    return result[0];
  }

  static async update(id: number, data: Partial<InsertOrganization>): Promise<Organization> {
    const result = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // Get organization members
  static async getMembers(organizationId: number): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  // Team Invitation methods
  static async createInvitation(data: InsertTeamInvitation): Promise<TeamInvitation> {
    const result = await db
      .insert(teamInvitations)
      .values(data)
      .returning();
    
    return result[0];
  }

  static async findInvitationByToken(token: string): Promise<TeamInvitation | null> {
    const result = await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.token, token),
        isNull(teamInvitations.acceptedAt),
        gt(teamInvitations.expiresAt, new Date())
      ))
      .limit(1);
    
    return result[0] || null;
  }

  static async findInvitationByEmail(email: string, organizationId: number): Promise<TeamInvitation | null> {
    const result = await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.email, email),
        eq(teamInvitations.organizationId, organizationId),
        isNull(teamInvitations.acceptedAt)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  static async findPendingInvitations(organizationId: number): Promise<TeamInvitation[]> {
    return db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.organizationId, organizationId),
        isNull(teamInvitations.acceptedAt),
        gt(teamInvitations.expiresAt, new Date())
      ));
  }

  static async acceptInvitation(id: number): Promise<TeamInvitation> {
    const result = await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.id, id))
      .returning();
    
    return result[0];
  }

  static async deleteInvitation(id: number): Promise<void> {
    await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
  }

  static async findInvitationById(id: number): Promise<TeamInvitation | null> {
    const result = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, id))
      .limit(1);
    
    return result[0] || null;
  }
}
