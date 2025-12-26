/**
 * Integration Tests for Team Invitation Flows
 * 
 * Feature: multi-organization-membership
 * 
 * These tests validate the invitation acceptance flows:
 * - Existing user invitation acceptance (Requirements: 5.1, 5.2)
 * - New user invitation acceptance (Requirements: 5.3, 5.4)
 * - Duplicate email error handling (Requirement: 5.5)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock types to simulate the domain entities
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  activeOrganizationId: number | null;
  organizationId: number | null;
  role: string;
}

interface Organization {
  id: number;
  name: string;
  ownerId: number;
  planType: string;
  subscriptionStatus: string;
}

interface OrganizationMembership {
  id: number;
  userId: number;
  organizationId: number;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  invitedBy: number | null;
}

interface TeamInvitation {
  id: number;
  organizationId: number;
  email: string;
  role: 'admin' | 'member';
  token: string;
  invitedBy: number;
  expiresAt: Date;
  acceptedAt: Date | null;
}

// In-memory stores for testing
class InMemoryUserStore {
  private users: Map<number, User> = new Map();
  private userIdCounter = 1;

  create(data: Omit<User, 'id'>): User {
    const user: User = { ...data, id: this.userIdCounter++ };
    this.users.set(user.id, user);
    return user;
  }

  findById(id: number): User | null {
    return this.users.get(id) ?? null;
  }

  findByEmail(email: string): User | null {
    return Array.from(this.users.values()).find(u => u.email === email) ?? null;
  }

  update(id: number, data: Partial<User>): User | null {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, data);
    }
    return user ?? null;
  }

  clear(): void {
    this.users.clear();
    this.userIdCounter = 1;
  }
}

class InMemoryOrganizationStore {
  private organizations: Map<number, Organization> = new Map();
  private orgIdCounter = 1;

  create(data: Omit<Organization, 'id'>): Organization {
    const org: Organization = { ...data, id: this.orgIdCounter++ };
    this.organizations.set(org.id, org);
    return org;
  }

  findById(id: number): Organization | null {
    return this.organizations.get(id) ?? null;
  }

  clear(): void {
    this.organizations.clear();
    this.orgIdCounter = 1;
  }
}

class InMemoryMembershipStore {
  private memberships: Map<string, OrganizationMembership> = new Map();
  private membershipIdCounter = 1;

  private getKey(userId: number, organizationId: number): string {
    return `${userId}-${organizationId}`;
  }

  findByUserId(userId: number): OrganizationMembership[] {
    return Array.from(this.memberships.values()).filter(m => m.userId === userId);
  }

  findByUserAndOrg(userId: number, organizationId: number): OrganizationMembership | null {
    return this.memberships.get(this.getKey(userId, organizationId)) ?? null;
  }

  countByOrganizationId(organizationId: number): number {
    return Array.from(this.memberships.values()).filter(m => m.organizationId === organizationId).length;
  }

  create(data: Omit<OrganizationMembership, 'id'>): OrganizationMembership {
    const key = this.getKey(data.userId, data.organizationId);
    if (this.memberships.has(key)) {
      throw new Error('Membership already exists');
    }
    const membership: OrganizationMembership = { ...data, id: this.membershipIdCounter++ };
    this.memberships.set(key, membership);
    return membership;
  }

  delete(userId: number, organizationId: number): boolean {
    return this.memberships.delete(this.getKey(userId, organizationId));
  }

  clear(): void {
    this.memberships.clear();
    this.membershipIdCounter = 1;
  }
}

class InMemoryInvitationStore {
  private invitations: Map<number, TeamInvitation> = new Map();
  private invitationIdCounter = 1;

  create(data: Omit<TeamInvitation, 'id'>): TeamInvitation {
    const invitation: TeamInvitation = { ...data, id: this.invitationIdCounter++ };
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  findByToken(token: string): TeamInvitation | null {
    const invitation = Array.from(this.invitations.values()).find(
      i => i.token === token && !i.acceptedAt && i.expiresAt > new Date()
    );
    return invitation ?? null;
  }

  findByEmail(email: string, organizationId: number): TeamInvitation | null {
    return Array.from(this.invitations.values()).find(
      i => i.email === email && i.organizationId === organizationId && !i.acceptedAt
    ) ?? null;
  }

  accept(id: number): TeamInvitation | null {
    const invitation = this.invitations.get(id);
    if (invitation) {
      invitation.acceptedAt = new Date();
    }
    return invitation ?? null;
  }

  clear(): void {
    this.invitations.clear();
    this.invitationIdCounter = 1;
  }
}

// Simulated Invitation Service
class InvitationService {
  constructor(
    private userStore: InMemoryUserStore,
    private orgStore: InMemoryOrganizationStore,
    private membershipStore: InMemoryMembershipStore,
    private invitationStore: InMemoryInvitationStore
  ) {}

  /**
   * Accept an invitation
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  acceptInvitation(data: {
    token: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    phone?: string;
  }): {
    user: User;
    organization: Organization;
    isExistingUser: boolean;
  } {
    const invitation = this.invitationStore.findByToken(data.token);
    if (!invitation) {
      throw new Error('Convite inválido ou expirado');
    }

    const organization = this.orgStore.findById(invitation.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check if email is already registered
    const existingUser = this.userStore.findByEmail(invitation.email);
    
    if (existingUser) {
      // Requirements: 5.1, 5.2 - Existing user flow
      const existingMembership = this.membershipStore.findByUserAndOrg(
        existingUser.id,
        invitation.organizationId
      );

      if (existingMembership) {
        throw new Error('Utilizador já é membro desta organização');
      }

      // Add membership without creating new user
      this.membershipStore.create({
        userId: existingUser.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
        joinedAt: new Date(),
        invitedBy: invitation.invitedBy,
      });

      this.invitationStore.accept(invitation.id);

      return { user: existingUser, organization, isExistingUser: true };
    }

    // Requirements: 5.3, 5.4 - New user flow
    if (!data.firstName || !data.lastName || !data.password) {
      throw new Error('Nome, sobrenome e senha são obrigatórios para novos utilizadores');
    }

    // Create new user
    const newUser = this.userStore.create({
      email: invitation.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      activeOrganizationId: null,
      organizationId: null,
      role: 'owner',
    });

    // Create user's own organization
    const userOwnOrg = this.orgStore.create({
      name: `${data.firstName} ${data.lastName}`.trim(),
      ownerId: newUser.id,
      planType: 'basic',
      subscriptionStatus: 'trialing',
    });

    // Create owner membership for user's own org
    this.membershipStore.create({
      userId: newUser.id,
      organizationId: userOwnOrg.id,
      role: 'owner',
      joinedAt: new Date(),
      invitedBy: null,
    });

    // Update user with own org
    this.userStore.update(newUser.id, {
      activeOrganizationId: userOwnOrg.id,
      organizationId: userOwnOrg.id,
    });

    // Add membership to inviting organization
    this.membershipStore.create({
      userId: newUser.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy,
    });

    this.invitationStore.accept(invitation.id);

    const updatedUser = this.userStore.findById(newUser.id)!;
    return { user: updatedUser, organization, isExistingUser: false };
  }

  /**
   * Create an invitation
   */
  createInvitation(
    organizationId: number,
    email: string,
    role: 'admin' | 'member',
    invitedBy: number
  ): TeamInvitation {
    // Check if there's already a pending invitation
    const existingInvitation = this.invitationStore.findByEmail(email, organizationId);
    if (existingInvitation) {
      throw new Error('Já existe um convite pendente para este email');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.invitationStore.create({
      organizationId,
      email,
      role,
      token: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invitedBy,
      expiresAt,
      acceptedAt: null,
    });
  }
}

// Arbitraries for generating test data
const emailArb = fc.emailAddress();
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const passwordArb = fc.string({ minLength: 8, maxLength: 50 });
const roleArb = fc.constantFrom('admin', 'member') as fc.Arbitrary<'admin' | 'member'>;

describe('Invitation Flows Integration Tests', () => {
  let userStore: InMemoryUserStore;
  let orgStore: InMemoryOrganizationStore;
  let membershipStore: InMemoryMembershipStore;
  let invitationStore: InMemoryInvitationStore;
  let invitationService: InvitationService;

  beforeEach(() => {
    userStore = new InMemoryUserStore();
    orgStore = new InMemoryOrganizationStore();
    membershipStore = new InMemoryMembershipStore();
    invitationStore = new InMemoryInvitationStore();
    invitationService = new InvitationService(
      userStore,
      orgStore,
      membershipStore,
      invitationStore
    );
  });

  /**
   * Test: Existing User Invitation Acceptance
   * Requirements: 5.1, 5.2
   */
  describe('Existing User Invitation', () => {
    it('should add membership without creating new user when existing user accepts invitation', () => {
      fc.assert(
        fc.property(
          nameArb,
          nameArb,
          emailArb,
          passwordArb,
          nameArb,
          roleArb,
          (firstName, lastName, email, password, orgName, inviteRole) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();
            invitationStore.clear();

            // Create existing user with their own organization
            const existingUser = userStore.create({
              email,
              firstName,
              lastName,
              password,
              activeOrganizationId: null,
              organizationId: null,
              role: 'owner',
            });

            const userOwnOrg = orgStore.create({
              name: `${firstName} ${lastName}`,
              ownerId: existingUser.id,
              planType: 'basic',
              subscriptionStatus: 'trialing',
            });

            membershipStore.create({
              userId: existingUser.id,
              organizationId: userOwnOrg.id,
              role: 'owner',
              joinedAt: new Date(),
              invitedBy: null,
            });

            userStore.update(existingUser.id, {
              activeOrganizationId: userOwnOrg.id,
              organizationId: userOwnOrg.id,
            });

            // Create inviting organization (owned by another user)
            const invitingOwner = userStore.create({
              email: 'owner@example.com',
              firstName: 'Owner',
              lastName: 'User',
              password: 'password123',
              activeOrganizationId: null,
              organizationId: null,
              role: 'owner',
            });

            const invitingOrg = orgStore.create({
              name: orgName,
              ownerId: invitingOwner.id,
              planType: 'premium',
              subscriptionStatus: 'active',
            });

            membershipStore.create({
              userId: invitingOwner.id,
              organizationId: invitingOrg.id,
              role: 'owner',
              joinedAt: new Date(),
              invitedBy: null,
            });

            // Create invitation for existing user
            const invitation = invitationService.createInvitation(
              invitingOrg.id,
              email,
              inviteRole,
              invitingOwner.id
            );

            // Count memberships before acceptance
            const membershipsBefore = membershipStore.findByUserId(existingUser.id);
            const userCountBefore = Array.from(userStore['users'].values()).length;

            // Accept invitation
            const result = invitationService.acceptInvitation({
              token: invitation.token,
            });

            // Assertions
            expect(result.isExistingUser).toBe(true);
            expect(result.user.id).toBe(existingUser.id);
            expect(result.user.email).toBe(email);

            // User count should not change (no new user created)
            const userCountAfter = Array.from(userStore['users'].values()).length;
            expect(userCountAfter).toBe(userCountBefore);

            // Membership count should increase by 1
            const membershipsAfter = membershipStore.findByUserId(existingUser.id);
            expect(membershipsAfter.length).toBe(membershipsBefore.length + 1);

            // New membership should be for inviting org with correct role
            const newMembership = membershipStore.findByUserAndOrg(existingUser.id, invitingOrg.id);
            expect(newMembership).not.toBeNull();
            expect(newMembership?.role).toBe(inviteRole);
            expect(newMembership?.invitedBy).toBe(invitingOwner.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Test: New User Invitation Acceptance
   * Requirements: 5.3, 5.4
   */
  describe('New User Invitation', () => {
    it('should create user account, own organization, and add to inviting org', () => {
      fc.assert(
        fc.property(
          nameArb,
          nameArb,
          emailArb,
          passwordArb,
          nameArb,
          roleArb,
          (firstName, lastName, email, password, orgName, inviteRole) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();
            invitationStore.clear();

            // Create inviting organization
            const invitingOwner = userStore.create({
              email: 'owner@example.com',
              firstName: 'Owner',
              lastName: 'User',
              password: 'password123',
              activeOrganizationId: null,
              organizationId: null,
              role: 'owner',
            });

            const invitingOrg = orgStore.create({
              name: orgName,
              ownerId: invitingOwner.id,
              planType: 'premium',
              subscriptionStatus: 'active',
            });

            membershipStore.create({
              userId: invitingOwner.id,
              organizationId: invitingOrg.id,
              role: 'owner',
              joinedAt: new Date(),
              invitedBy: null,
            });

            // Create invitation for new user
            const invitation = invitationService.createInvitation(
              invitingOrg.id,
              email,
              inviteRole,
              invitingOwner.id
            );

            // Accept invitation as new user
            const result = invitationService.acceptInvitation({
              token: invitation.token,
              firstName,
              lastName,
              password,
            });

            // Assertions
            expect(result.isExistingUser).toBe(false);
            expect(result.user.email).toBe(email);
            expect(result.user.firstName).toBe(firstName);
            expect(result.user.lastName).toBe(lastName);

            // User should have 2 memberships: own org (owner) + inviting org (invited role)
            const memberships = membershipStore.findByUserId(result.user.id);
            expect(memberships.length).toBe(2);

            // Check own organization membership
            const ownOrgMembership = memberships.find(m => m.role === 'owner');
            expect(ownOrgMembership).not.toBeNull();
            expect(ownOrgMembership?.invitedBy).toBeNull();

            // Check inviting organization membership
            const invitingOrgMembership = membershipStore.findByUserAndOrg(result.user.id, invitingOrg.id);
            expect(invitingOrgMembership).not.toBeNull();
            expect(invitingOrgMembership?.role).toBe(inviteRole);
            expect(invitingOrgMembership?.invitedBy).toBe(invitingOwner.id);

            // User's active organization should be their own org
            expect(result.user.activeOrganizationId).not.toBe(invitingOrg.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject new user invitation without required fields', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();
      invitationStore.clear();

      // Create inviting organization
      const invitingOwner = userStore.create({
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'User',
        password: 'password123',
        activeOrganizationId: null,
        organizationId: null,
        role: 'owner',
      });

      const invitingOrg = orgStore.create({
        name: 'Test Org',
        ownerId: invitingOwner.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });

      // Create invitation for new user
      const invitation = invitationService.createInvitation(
        invitingOrg.id,
        'newuser@example.com',
        'member',
        invitingOwner.id
      );

      // Should throw when missing required fields
      expect(() => invitationService.acceptInvitation({
        token: invitation.token,
      })).toThrow('Nome, sobrenome e senha são obrigatórios para novos utilizadores');

      expect(() => invitationService.acceptInvitation({
        token: invitation.token,
        firstName: 'John',
      })).toThrow('Nome, sobrenome e senha são obrigatórios para novos utilizadores');

      expect(() => invitationService.acceptInvitation({
        token: invitation.token,
        firstName: 'John',
        lastName: 'Doe',
      })).toThrow('Nome, sobrenome e senha são obrigatórios para novos utilizadores');
    });
  });

  /**
   * Test: Duplicate Email Error
   * Requirement: 5.5
   */
  describe('Duplicate Email Error', () => {
    it('should reject invitation acceptance if user is already a member', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();
      invitationStore.clear();

      // Create existing user
      const existingUser = userStore.create({
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        password: 'password123',
        activeOrganizationId: null,
        organizationId: null,
        role: 'owner',
      });

      // Create organization
      const org = orgStore.create({
        name: 'Test Org',
        ownerId: existingUser.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });

      // User is already a member
      membershipStore.create({
        userId: existingUser.id,
        organizationId: org.id,
        role: 'owner',
        joinedAt: new Date(),
        invitedBy: null,
      });

      // Create invitation for same user to same org
      const invitation = invitationStore.create({
        organizationId: org.id,
        email: existingUser.email,
        role: 'member',
        token: 'test-token',
        invitedBy: existingUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
      });

      // Should throw when user is already a member
      expect(() => invitationService.acceptInvitation({
        token: invitation.token,
      })).toThrow('Utilizador já é membro desta organização');
    });

    it('should reject duplicate pending invitations', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();
      invitationStore.clear();

      // Create organization owner
      const owner = userStore.create({
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'User',
        password: 'password123',
        activeOrganizationId: null,
        organizationId: null,
        role: 'owner',
      });

      const org = orgStore.create({
        name: 'Test Org',
        ownerId: owner.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });

      // Create first invitation
      invitationService.createInvitation(org.id, 'newuser@example.com', 'member', owner.id);

      // Should throw when creating duplicate invitation
      expect(() => invitationService.createInvitation(
        org.id,
        'newuser@example.com',
        'admin',
        owner.id
      )).toThrow('Já existe um convite pendente para este email');
    });
  });

  /**
   * Test: Invalid/Expired Token
   */
  describe('Invalid Token Handling', () => {
    it('should reject invalid invitation token', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();
      invitationStore.clear();

      expect(() => invitationService.acceptInvitation({
        token: 'invalid-token',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      })).toThrow('Convite inválido ou expirado');
    });

    it('should reject expired invitation token', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();
      invitationStore.clear();

      // Create organization
      const owner = userStore.create({
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'User',
        password: 'password123',
        activeOrganizationId: null,
        organizationId: null,
        role: 'owner',
      });

      const org = orgStore.create({
        name: 'Test Org',
        ownerId: owner.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });

      // Create expired invitation
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      invitationStore.create({
        organizationId: org.id,
        email: 'newuser@example.com',
        role: 'member',
        token: 'expired-token',
        invitedBy: owner.id,
        expiresAt: expiredDate,
        acceptedAt: null,
      });

      expect(() => invitationService.acceptInvitation({
        token: 'expired-token',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      })).toThrow('Convite inválido ou expirado');
    });
  });
});
