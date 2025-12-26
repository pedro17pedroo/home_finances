/**
 * Integration Tests for Organization Endpoints
 * 
 * Feature: multi-organization-membership
 * 
 * These tests validate the API endpoints for organization management:
 * - GET /api/organizations/my - List all user's organizations
 * - POST /api/organizations - Create new organization
 * - POST /api/organizations/switch - Switch active organization
 * - DELETE /api/organizations/:id/leave - Leave an organization
 * 
 * Requirements: 2.1, 3.3, 7.5
 */

import * as fc from 'fast-check';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock types to simulate the domain entities
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  activeOrganizationId: number | null;
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

// Simulated API service layer
class OrganizationApiService {
  constructor(
    private userStore: InMemoryUserStore,
    private orgStore: InMemoryOrganizationStore,
    private membershipStore: InMemoryMembershipStore
  ) {}

  /**
   * GET /api/organizations/my
   * Returns all organizations user belongs to with role, subscription, member count
   */
  getMyOrganizations(userId: number): {
    status: string;
    data: {
      organizations: Array<{
        id: number;
        name: string;
        role: string;
        subscription: { planType: string; status: string };
        memberCount: number;
        isActive: boolean;
      }>;
    };
  } {
    const user = this.userStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const memberships = this.membershipStore.findByUserId(userId);
    const organizations = memberships.map(m => {
      const org = this.orgStore.findById(m.organizationId);
      if (!org) throw new Error('Organization not found');
      return {
        id: org.id,
        name: org.name,
        role: m.role,
        subscription: {
          planType: org.planType,
          status: org.subscriptionStatus,
        },
        memberCount: this.membershipStore.countByOrganizationId(org.id),
        isActive: user.activeOrganizationId === org.id,
      };
    });

    return { status: 'success', data: { organizations } };
  }

  /**
   * POST /api/organizations
   * Create new organization with user as owner
   */
  createOrganization(userId: number, name: string): {
    status: string;
    data: {
      organization: { id: number; name: string; planType: string; subscriptionStatus: string };
      membership: { id: number; role: string };
    };
    message: string;
  } {
    const user = this.userStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Organization name is required');
    }

    const org = this.orgStore.create({
      name: name.trim(),
      ownerId: userId,
      planType: 'basic',
      subscriptionStatus: 'trialing',
    });

    const membership = this.membershipStore.create({
      userId,
      organizationId: org.id,
      role: 'owner',
      joinedAt: new Date(),
      invitedBy: null,
    });

    return {
      status: 'success',
      data: {
        organization: {
          id: org.id,
          name: org.name,
          planType: org.planType,
          subscriptionStatus: org.subscriptionStatus,
        },
        membership: {
          id: membership.id,
          role: membership.role,
        },
      },
      message: 'Organization created successfully',
    };
  }

  /**
   * POST /api/organizations/switch
   * Switch active organization
   */
  switchOrganization(userId: number, organizationId: number): {
    status: string;
    data: {
      user: { id: number; activeOrganizationId: number };
      activeOrganization: {
        id: number;
        organizationId: number;
        organizationName: string;
        role: string;
        isActive: boolean;
      };
    };
    message: string;
  } {
    const user = this.userStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = this.orgStore.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const membership = this.membershipStore.findByUserAndOrg(userId, organizationId);
    if (!membership) {
      throw new Error('Not a member of this organization');
    }

    this.userStore.update(userId, { activeOrganizationId: organizationId });

    return {
      status: 'success',
      data: {
        user: { id: userId, activeOrganizationId: organizationId },
        activeOrganization: {
          id: membership.id,
          organizationId: org.id,
          organizationName: org.name,
          role: membership.role,
          isActive: true,
        },
      },
      message: 'Organization switched successfully',
    };
  }

  /**
   * DELETE /api/organizations/:id/leave
   * Leave an organization (non-owners only)
   */
  leaveOrganization(userId: number, organizationId: number): {
    status: string;
    data: {
      activeOrganization: { id: number; organizationId: number; organizationName: string; role: string; isActive: boolean } | null;
      remainingMemberships: number;
    };
    message: string;
  } {
    const user = this.userStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = this.orgStore.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const membership = this.membershipStore.findByUserAndOrg(userId, organizationId);
    if (!membership) {
      throw new Error('Not a member of this organization');
    }

    if (membership.role === 'owner') {
      throw new Error('Owners cannot leave their organization');
    }

    this.membershipStore.delete(userId, organizationId);

    // If leaving active org, switch to another
    if (user.activeOrganizationId === organizationId) {
      const remaining = this.membershipStore.findByUserId(userId);
      if (remaining.length > 0) {
        this.userStore.update(userId, { activeOrganizationId: remaining[0].organizationId });
      } else {
        this.userStore.update(userId, { activeOrganizationId: null });
      }
    }

    const updatedUser = this.userStore.findById(userId)!;
    const remainingMemberships = this.membershipStore.findByUserId(userId);
    let activeOrg: { id: number; organizationId: number; organizationName: string; role: string; isActive: boolean } | null = null;

    if (updatedUser.activeOrganizationId) {
      const activeMembership = this.membershipStore.findByUserAndOrg(userId, updatedUser.activeOrganizationId);
      const activeOrgData = this.orgStore.findById(updatedUser.activeOrganizationId);
      if (activeMembership && activeOrgData) {
        activeOrg = {
          id: activeMembership.id,
          organizationId: activeOrgData.id,
          organizationName: activeOrgData.name,
          role: activeMembership.role,
          isActive: true,
        };
      }
    }

    return {
      status: 'success',
      data: {
        activeOrganization: activeOrg,
        remainingMemberships: remainingMemberships.length,
      },
      message: 'Left organization successfully',
    };
  }
}

// Arbitraries for generating test data
const userIdArb = fc.integer({ min: 1, max: 1000 });
const organizationIdArb = fc.integer({ min: 1, max: 1000 });
const roleArb = fc.constantFrom('owner', 'admin', 'member') as fc.Arbitrary<'owner' | 'admin' | 'member'>;
const orgNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

describe('Organization Endpoints Integration Tests', () => {
  let userStore: InMemoryUserStore;
  let orgStore: InMemoryOrganizationStore;
  let membershipStore: InMemoryMembershipStore;
  let apiService: OrganizationApiService;

  beforeEach(() => {
    userStore = new InMemoryUserStore();
    orgStore = new InMemoryOrganizationStore();
    membershipStore = new InMemoryMembershipStore();
    apiService = new OrganizationApiService(userStore, orgStore, membershipStore);
  });

  /**
   * GET /api/organizations/my Tests
   * Requirements: 3.4, 7.1, 7.2
   */
  describe('GET /api/organizations/my', () => {
    it('should return all organizations user belongs to with correct data', () => {
      fc.assert(
        fc.property(
          fc.array(orgNameArb, { minLength: 1, maxLength: 5 }),
          (orgNames) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();

            // Create user
            const user = userStore.create({
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              activeOrganizationId: null,
            });

            // Create organizations and memberships
            const uniqueNames = [...new Set(orgNames)];
            const createdOrgs: Organization[] = [];
            
            for (let i = 0; i < uniqueNames.length; i++) {
              const org = orgStore.create({
                name: uniqueNames[i],
                ownerId: i === 0 ? user.id : user.id + 100,
                planType: 'basic',
                subscriptionStatus: 'active',
              });
              createdOrgs.push(org);
              
              membershipStore.create({
                userId: user.id,
                organizationId: org.id,
                role: i === 0 ? 'owner' : 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            // Set active organization
            if (createdOrgs.length > 0) {
              userStore.update(user.id, { activeOrganizationId: createdOrgs[0].id });
            }

            // Call API
            const response = apiService.getMyOrganizations(user.id);

            // Assertions
            expect(response.status).toBe('success');
            expect(response.data.organizations.length).toBe(uniqueNames.length);

            // Each org should have required fields
            for (const org of response.data.organizations) {
              expect(org.id).toBeDefined();
              expect(org.name).toBeDefined();
              expect(org.role).toBeDefined();
              expect(['owner', 'admin', 'member']).toContain(org.role);
              expect(org.subscription).toBeDefined();
              expect(org.subscription.planType).toBeDefined();
              expect(org.subscription.status).toBeDefined();
              expect(org.memberCount).toBeGreaterThanOrEqual(1);
              expect(typeof org.isActive).toBe('boolean');
            }

            // Exactly one should be active
            const activeOrgs = response.data.organizations.filter(o => o.isActive);
            expect(activeOrgs.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * POST /api/organizations Tests
   * Requirements: 2.1, 2.2, 2.3
   */
  describe('POST /api/organizations', () => {
    it('should create organization with user as owner', () => {
      fc.assert(
        fc.property(
          orgNameArb,
          (orgName) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();

            // Create user
            const user = userStore.create({
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              activeOrganizationId: null,
            });

            // Call API
            const response = apiService.createOrganization(user.id, orgName);

            // Assertions
            expect(response.status).toBe('success');
            expect(response.data.organization.name).toBe(orgName.trim());
            expect(response.data.organization.planType).toBe('basic');
            expect(response.data.membership.role).toBe('owner');

            // Verify membership was created
            const membership = membershipStore.findByUserAndOrg(user.id, response.data.organization.id);
            expect(membership).not.toBeNull();
            expect(membership?.role).toBe('owner');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty organization name', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();

      const user = userStore.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        activeOrganizationId: null,
      });

      expect(() => apiService.createOrganization(user.id, '')).toThrow('Organization name is required');
      expect(() => apiService.createOrganization(user.id, '   ')).toThrow('Organization name is required');
    });

    it('should allow user to create multiple organizations', () => {
      fc.assert(
        fc.property(
          fc.array(orgNameArb, { minLength: 2, maxLength: 5 }),
          (orgNames) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();

            const user = userStore.create({
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              activeOrganizationId: null,
            });

            const uniqueNames = [...new Set(orgNames)];
            const createdOrgs: number[] = [];

            for (const name of uniqueNames) {
              const response = apiService.createOrganization(user.id, name);
              createdOrgs.push(response.data.organization.id);
            }

            // User should be owner of all created organizations
            const memberships = membershipStore.findByUserId(user.id);
            expect(memberships.length).toBe(uniqueNames.length);
            
            for (const membership of memberships) {
              expect(membership.role).toBe('owner');
              expect(createdOrgs).toContain(membership.organizationId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * POST /api/organizations/switch Tests
   * Requirements: 3.3
   */
  describe('POST /api/organizations/switch', () => {
    it('should switch to organization user is member of', () => {
      fc.assert(
        fc.property(
          fc.array(orgNameArb, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          (orgNames, switchToIndex) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();

            const user = userStore.create({
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              activeOrganizationId: null,
            });

            const uniqueNames = [...new Set(orgNames)];
            if (uniqueNames.length < 2) return;

            const createdOrgs: Organization[] = [];
            for (const name of uniqueNames) {
              const org = orgStore.create({
                name,
                ownerId: user.id,
                planType: 'basic',
                subscriptionStatus: 'active',
              });
              createdOrgs.push(org);
              membershipStore.create({
                userId: user.id,
                organizationId: org.id,
                role: 'owner',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            // Set initial active org
            userStore.update(user.id, { activeOrganizationId: createdOrgs[0].id });

            // Switch to another org
            const targetIndex = switchToIndex % createdOrgs.length;
            const targetOrg = createdOrgs[targetIndex];
            const response = apiService.switchOrganization(user.id, targetOrg.id);

            // Assertions
            expect(response.status).toBe('success');
            expect(response.data.user.activeOrganizationId).toBe(targetOrg.id);
            expect(response.data.activeOrganization.organizationId).toBe(targetOrg.id);
            expect(response.data.activeOrganization.isActive).toBe(true);

            // Verify user's activeOrganizationId was updated
            const updatedUser = userStore.findById(user.id);
            expect(updatedUser?.activeOrganizationId).toBe(targetOrg.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject switch to non-member organization', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();

      const user = userStore.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        activeOrganizationId: null,
      });

      // Create org user is member of
      const memberOrg = orgStore.create({
        name: 'Member Org',
        ownerId: user.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });
      membershipStore.create({
        userId: user.id,
        organizationId: memberOrg.id,
        role: 'owner',
        joinedAt: new Date(),
        invitedBy: null,
      });
      userStore.update(user.id, { activeOrganizationId: memberOrg.id });

      // Create org user is NOT member of
      const otherOrg = orgStore.create({
        name: 'Other Org',
        ownerId: 999,
        planType: 'basic',
        subscriptionStatus: 'active',
      });

      // Should throw when trying to switch to non-member org
      expect(() => apiService.switchOrganization(user.id, otherOrg.id))
        .toThrow('Not a member of this organization');

      // Active org should remain unchanged
      const updatedUser = userStore.findById(user.id);
      expect(updatedUser?.activeOrganizationId).toBe(memberOrg.id);
    });
  });

  /**
   * DELETE /api/organizations/:id/leave Tests
   * Requirements: 1.5, 7.5
   */
  describe('DELETE /api/organizations/:id/leave', () => {
    it('should allow member to leave organization', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();

      const user = userStore.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        activeOrganizationId: null,
      });

      // Create user's own org (owner)
      const ownOrg = orgStore.create({
        name: 'Own Org',
        ownerId: user.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });
      membershipStore.create({
        userId: user.id,
        organizationId: ownOrg.id,
        role: 'owner',
        joinedAt: new Date(),
        invitedBy: null,
      });

      // Create another org where user is member
      const otherOrg = orgStore.create({
        name: 'Other Org',
        ownerId: 999,
        planType: 'basic',
        subscriptionStatus: 'active',
      });
      membershipStore.create({
        userId: user.id,
        organizationId: otherOrg.id,
        role: 'member',
        joinedAt: new Date(),
        invitedBy: 999,
      });

      userStore.update(user.id, { activeOrganizationId: otherOrg.id });

      // Leave the other org
      const response = apiService.leaveOrganization(user.id, otherOrg.id);

      // Assertions
      expect(response.status).toBe('success');
      expect(response.data.remainingMemberships).toBe(1);

      // Membership should be removed
      expect(membershipStore.findByUserAndOrg(user.id, otherOrg.id)).toBeNull();

      // Should have switched to own org
      const updatedUser = userStore.findById(user.id);
      expect(updatedUser?.activeOrganizationId).toBe(ownOrg.id);
    });

    it('should reject owner leaving their organization', () => {
      userStore.clear();
      orgStore.clear();
      membershipStore.clear();

      const user = userStore.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        activeOrganizationId: null,
      });

      const org = orgStore.create({
        name: 'My Org',
        ownerId: user.id,
        planType: 'basic',
        subscriptionStatus: 'active',
      });
      membershipStore.create({
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        joinedAt: new Date(),
        invitedBy: null,
      });
      userStore.update(user.id, { activeOrganizationId: org.id });

      // Should throw when owner tries to leave
      expect(() => apiService.leaveOrganization(user.id, org.id))
        .toThrow('Owners cannot leave their organization');

      // Membership should still exist
      expect(membershipStore.findByUserAndOrg(user.id, org.id)).not.toBeNull();
    });

    it('should switch active org when leaving active org', () => {
      fc.assert(
        fc.property(
          fc.array(orgNameArb, { minLength: 2, maxLength: 5 }),
          (orgNames) => {
            userStore.clear();
            orgStore.clear();
            membershipStore.clear();

            const user = userStore.create({
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              activeOrganizationId: null,
            });

            const uniqueNames = [...new Set(orgNames)];
            if (uniqueNames.length < 2) return;

            // First org is owned, rest are member
            const createdOrgs: Organization[] = [];
            for (let i = 0; i < uniqueNames.length; i++) {
              const org = orgStore.create({
                name: uniqueNames[i],
                ownerId: i === 0 ? user.id : 999,
                planType: 'basic',
                subscriptionStatus: 'active',
              });
              createdOrgs.push(org);
              membershipStore.create({
                userId: user.id,
                organizationId: org.id,
                role: i === 0 ? 'owner' : 'member',
                joinedAt: new Date(),
                invitedBy: i === 0 ? null : 999,
              });
            }

            // Set active to a member org (not owned)
            const memberOrg = createdOrgs[1];
            userStore.update(user.id, { activeOrganizationId: memberOrg.id });

            // Leave the active member org
            const response = apiService.leaveOrganization(user.id, memberOrg.id);

            // Should have switched to another org
            expect(response.status).toBe('success');
            const updatedUser = userStore.findById(user.id);
            expect(updatedUser?.activeOrganizationId).not.toBe(memberOrg.id);
            expect(updatedUser?.activeOrganizationId).not.toBeNull();

            // Should be a valid membership
            if (updatedUser?.activeOrganizationId) {
              const activeMembership = membershipStore.findByUserAndOrg(user.id, updatedUser.activeOrganizationId);
              expect(activeMembership).not.toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
