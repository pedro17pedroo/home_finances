/**
 * Property-Based Tests for Organization Membership Operations
 * 
 * Feature: multi-organization-membership
 * 
 * These tests validate the correctness properties defined in the design document
 * for the organization membership functionality.
 */

import * as fc from 'fast-check';

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

// In-memory store for testing
class InMemoryMembershipStore {
  private memberships: Map<string, OrganizationMembership> = new Map();
  private membershipIdCounter = 1;

  private getKey(userId: number, organizationId: number): string {
    return `${userId}-${organizationId}`;
  }

  findByUserId(userId: number): OrganizationMembership[] {
    return Array.from(this.memberships.values()).filter(m => m.userId === userId);
  }

  findByOrganizationId(organizationId: number): OrganizationMembership[] {
    return Array.from(this.memberships.values()).filter(m => m.organizationId === organizationId);
  }

  findByUserAndOrg(userId: number, organizationId: number): OrganizationMembership | null {
    return this.memberships.get(this.getKey(userId, organizationId)) || null;
  }

  create(data: Omit<OrganizationMembership, 'id'>): OrganizationMembership {
    const key = this.getKey(data.userId, data.organizationId);
    if (this.memberships.has(key)) {
      throw new Error('Membership already exists');
    }
    const membership: OrganizationMembership = {
      ...data,
      id: this.membershipIdCounter++,
    };
    this.memberships.set(key, membership);
    return membership;
  }

  delete(userId: number, organizationId: number): boolean {
    const key = this.getKey(userId, organizationId);
    return this.memberships.delete(key);
  }

  clear(): void {
    this.memberships.clear();
    this.membershipIdCounter = 1;
  }

  count(): number {
    return this.memberships.size;
  }
}

// Arbitraries for generating test data
const userIdArb = fc.integer({ min: 1, max: 1000 });
const organizationIdArb = fc.integer({ min: 1, max: 1000 });
const roleArb = fc.constantFrom('owner', 'admin', 'member') as fc.Arbitrary<'owner' | 'admin' | 'member'>;

const membershipArb = fc.record({
  userId: userIdArb,
  organizationId: organizationIdArb,
  role: roleArb,
  joinedAt: fc.date(),
  invitedBy: fc.option(userIdArb, { nil: null }),
});

describe('Organization Membership Property Tests', () => {
  let store: InMemoryMembershipStore;

  beforeEach(() => {
    store = new InMemoryMembershipStore();
  });

  /**
   * Property 1: Multi-Membership Consistency
   * 
   * *For any* user with multiple organization memberships, querying their memberships 
   * should return all organizations they belong to, and each membership should have a valid role.
   * 
   * **Validates: Requirements 1.1, 1.4**
   */
  describe('Property 1: Multi-Membership Consistency', () => {
    it('should return all memberships for a user with valid roles', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(fc.record({
            organizationId: organizationIdArb,
            role: roleArb,
          }), { minLength: 1, maxLength: 10 }),
          (userId, orgMemberships) => {
            store.clear();
            
            // Create unique organization memberships for the user
            const uniqueOrgs = new Set<number>();
            const createdMemberships: OrganizationMembership[] = [];
            
            for (const orgMembership of orgMemberships) {
              if (!uniqueOrgs.has(orgMembership.organizationId)) {
                uniqueOrgs.add(orgMembership.organizationId);
                const membership = store.create({
                  userId,
                  organizationId: orgMembership.organizationId,
                  role: orgMembership.role,
                  joinedAt: new Date(),
                  invitedBy: null,
                });
                createdMemberships.push(membership);
              }
            }

            // Query memberships for the user
            const userMemberships = store.findByUserId(userId);

            // Property: All created memberships should be returned
            expect(userMemberships.length).toBe(createdMemberships.length);

            // Property: Each membership should have a valid role
            const validRoles = ['owner', 'admin', 'member'];
            for (const membership of userMemberships) {
              expect(validRoles).toContain(membership.role);
              expect(membership.userId).toBe(userId);
            }

            // Property: All organization IDs should be unique
            const orgIds = userMemberships.map(m => m.organizationId);
            expect(new Set(orgIds).size).toBe(orgIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify membership existence', () => {
      fc.assert(
        fc.property(
          userIdArb,
          organizationIdArb,
          roleArb,
          (userId, organizationId, role) => {
            store.clear();

            // Before creating membership, user should not be a member
            expect(store.findByUserAndOrg(userId, organizationId)).toBeNull();

            // Create membership
            store.create({
              userId,
              organizationId,
              role,
              joinedAt: new Date(),
              invitedBy: null,
            });

            // After creating membership, user should be a member
            const membership = store.findByUserAndOrg(userId, organizationId);
            expect(membership).not.toBeNull();
            expect(membership?.role).toBe(role);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Membership Operations Are Additive
   * 
   * *For any* user accepting an invitation or creating a new organization, 
   * their existing memberships should remain unchanged, and the total membership 
   * count should increase by exactly one.
   * 
   * **Validates: Requirements 1.3, 2.4**
   */
  describe('Property 3: Membership Operations Are Additive', () => {
    it('should preserve existing memberships when adding new ones', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(organizationIdArb, { minLength: 1, maxLength: 5 }),
          organizationIdArb,
          roleArb,
          (userId, existingOrgIds, newOrgId, newRole) => {
            store.clear();

            // Create initial memberships with unique org IDs
            const uniqueExistingOrgs = [...new Set(existingOrgIds)].filter(id => id !== newOrgId);
            const initialMemberships: OrganizationMembership[] = [];
            
            for (const orgId of uniqueExistingOrgs) {
              const membership = store.create({
                userId,
                organizationId: orgId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
              initialMemberships.push(membership);
            }

            const countBefore = store.findByUserId(userId).length;

            // Add new membership
            store.create({
              userId,
              organizationId: newOrgId,
              role: newRole,
              joinedAt: new Date(),
              invitedBy: null,
            });

            const countAfter = store.findByUserId(userId).length;

            // Property: Count should increase by exactly 1
            expect(countAfter).toBe(countBefore + 1);

            // Property: All existing memberships should still exist
            for (const initial of initialMemberships) {
              const found = store.findByUserAndOrg(initial.userId, initial.organizationId);
              expect(found).not.toBeNull();
              expect(found?.role).toBe(initial.role);
            }

            // Property: New membership should exist
            const newMembership = store.findByUserAndOrg(userId, newOrgId);
            expect(newMembership).not.toBeNull();
            expect(newMembership?.role).toBe(newRole);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow duplicate memberships', () => {
      fc.assert(
        fc.property(
          userIdArb,
          organizationIdArb,
          roleArb,
          roleArb,
          (userId, organizationId, role1, role2) => {
            store.clear();

            // Create first membership
            store.create({
              userId,
              organizationId,
              role: role1,
              joinedAt: new Date(),
              invitedBy: null,
            });

            // Attempting to create duplicate should throw
            expect(() => {
              store.create({
                userId,
                organizationId,
                role: role2,
                joinedAt: new Date(),
                invitedBy: null,
              });
            }).toThrow('Membership already exists');

            // Count should still be 1
            expect(store.findByUserId(userId).length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly remove memberships without affecting others', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(organizationIdArb, { minLength: 2, maxLength: 5 }),
          (userId, orgIds) => {
            store.clear();

            // Create memberships with unique org IDs
            const uniqueOrgIds = [...new Set(orgIds)];
            if (uniqueOrgIds.length < 2) return; // Need at least 2 unique orgs

            for (const orgId of uniqueOrgIds) {
              store.create({
                userId,
                organizationId: orgId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            const countBefore = store.findByUserId(userId).length;
            const orgToRemove = uniqueOrgIds[0];
            const remainingOrgs = uniqueOrgIds.slice(1);

            // Remove one membership
            store.delete(userId, orgToRemove);

            const countAfter = store.findByUserId(userId).length;

            // Property: Count should decrease by exactly 1
            expect(countAfter).toBe(countBefore - 1);

            // Property: Removed membership should not exist
            expect(store.findByUserAndOrg(userId, orgToRemove)).toBeNull();

            // Property: Other memberships should still exist
            for (const orgId of remainingOrgs) {
              expect(store.findByUserAndOrg(userId, orgId)).not.toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Active Organization Persistence
   * 
   * *For any* user session, the active organization should persist across login/logout cycles,
   * and switching organizations should update the active organization immediately.
   * 
   * **Validates: Requirements 3.2, 3.6**
   */
  describe('Property 4: Active Organization Persistence', () => {
    // In-memory user store for testing active organization
    class InMemoryUserStore {
      private users: Map<number, { id: number; activeOrganizationId: number | null }> = new Map();

      setActiveOrganization(userId: number, organizationId: number | null): void {
        const user = this.users.get(userId) || { id: userId, activeOrganizationId: null };
        user.activeOrganizationId = organizationId;
        this.users.set(userId, user);
      }

      getActiveOrganization(userId: number): number | null {
        return this.users.get(userId)?.activeOrganizationId || null;
      }

      clear(): void {
        this.users.clear();
      }
    }

    let userStore: InMemoryUserStore;

    beforeEach(() => {
      userStore = new InMemoryUserStore();
    });

    it('should persist active organization after switching', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(organizationIdArb, { minLength: 2, maxLength: 5 }),
          (userId, orgIds) => {
            store.clear();
            userStore.clear();

            // Create unique organization memberships
            const uniqueOrgIds = [...new Set(orgIds)];
            if (uniqueOrgIds.length < 2) return;

            for (const orgId of uniqueOrgIds) {
              store.create({
                userId,
                organizationId: orgId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            // Set initial active organization
            const initialActiveOrg = uniqueOrgIds[0];
            userStore.setActiveOrganization(userId, initialActiveOrg);

            // Property: Active organization should be set
            expect(userStore.getActiveOrganization(userId)).toBe(initialActiveOrg);

            // Switch to another organization
            const newActiveOrg = uniqueOrgIds[1];
            userStore.setActiveOrganization(userId, newActiveOrg);

            // Property: Active organization should be updated immediately
            expect(userStore.getActiveOrganization(userId)).toBe(newActiveOrg);

            // Property: Active organization should persist (simulate session persistence)
            const persistedActiveOrg = userStore.getActiveOrganization(userId);
            expect(persistedActiveOrg).toBe(newActiveOrg);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only allow switching to organizations user is member of', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(organizationIdArb, { minLength: 1, maxLength: 5 }),
          organizationIdArb,
          (userId, memberOrgIds, nonMemberOrgId) => {
            store.clear();
            userStore.clear();

            // Create memberships for specific organizations
            const uniqueMemberOrgs = [...new Set(memberOrgIds)].filter(id => id !== nonMemberOrgId);
            if (uniqueMemberOrgs.length === 0) return;

            for (const orgId of uniqueMemberOrgs) {
              store.create({
                userId,
                organizationId: orgId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            // Set initial active organization to a valid one
            userStore.setActiveOrganization(userId, uniqueMemberOrgs[0]);

            // Simulate switch organization logic
            const switchOrganization = (targetOrgId: number): boolean => {
              const membership = store.findByUserAndOrg(userId, targetOrgId);
              if (!membership) {
                return false; // Cannot switch to non-member org
              }
              userStore.setActiveOrganization(userId, targetOrgId);
              return true;
            };

            // Property: Switching to member organization should succeed
            for (const orgId of uniqueMemberOrgs) {
              expect(switchOrganization(orgId)).toBe(true);
              expect(userStore.getActiveOrganization(userId)).toBe(orgId);
            }

            // Property: Switching to non-member organization should fail
            // Only test if nonMemberOrgId is not in memberOrgs
            if (!uniqueMemberOrgs.includes(nonMemberOrgId)) {
              const previousActiveOrg = userStore.getActiveOrganization(userId);
              expect(switchOrganization(nonMemberOrgId)).toBe(false);
              // Active organization should remain unchanged
              expect(userStore.getActiveOrganization(userId)).toBe(previousActiveOrg);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain active organization across multiple switches', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(organizationIdArb, { minLength: 3, maxLength: 10 }),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 20 }),
          (userId, orgIds, switchSequence) => {
            store.clear();
            userStore.clear();

            // Create unique organization memberships
            const uniqueOrgIds = [...new Set(orgIds)];
            if (uniqueOrgIds.length < 2) return;

            for (const orgId of uniqueOrgIds) {
              store.create({
                userId,
                organizationId: orgId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            // Set initial active organization
            userStore.setActiveOrganization(userId, uniqueOrgIds[0]);

            // Perform multiple switches
            let expectedActiveOrg = uniqueOrgIds[0];
            for (const switchIndex of switchSequence) {
              const targetOrgIndex = switchIndex % uniqueOrgIds.length;
              const targetOrgId = uniqueOrgIds[targetOrgIndex];
              
              userStore.setActiveOrganization(userId, targetOrgId);
              expectedActiveOrg = targetOrgId;

              // Property: After each switch, active organization should be the target
              expect(userStore.getActiveOrganization(userId)).toBe(expectedActiveOrg);
            }

            // Property: Final active organization should be the last switched to
            expect(userStore.getActiveOrganization(userId)).toBe(expectedActiveOrg);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle fallback when active organization membership is removed', () => {
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(organizationIdArb, { minLength: 2, maxLength: 5 }),
          (userId, orgIds) => {
            store.clear();
            userStore.clear();

            // Create unique organization memberships
            const uniqueOrgIds = [...new Set(orgIds)];
            if (uniqueOrgIds.length < 2) return;

            for (const orgId of uniqueOrgIds) {
              store.create({
                userId,
                organizationId: orgId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: null,
              });
            }

            // Set active organization to first one
            const activeOrgId = uniqueOrgIds[0];
            userStore.setActiveOrganization(userId, activeOrgId);

            // Remove the active organization membership
            store.delete(userId, activeOrgId);

            // Simulate fallback logic
            const remainingMemberships = store.findByUserId(userId);
            if (remainingMemberships.length > 0) {
              userStore.setActiveOrganization(userId, remainingMemberships[0].organizationId);
            } else {
              userStore.setActiveOrganization(userId, null);
            }

            // Property: Active organization should be updated to a valid membership
            const newActiveOrg = userStore.getActiveOrganization(userId);
            if (remainingMemberships.length > 0) {
              expect(newActiveOrg).not.toBeNull();
              expect(store.findByUserAndOrg(userId, newActiveOrg!)).not.toBeNull();
            } else {
              expect(newActiveOrg).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 2: Registration Creates Owner Membership
 * 
 * *For any* new user registration, the system should create exactly one organization 
 * where the user is the owner, and the user should have exactly one membership with 
 * role 'owner' after registration.
 * 
 * **Validates: Requirements 1.2, 2.2**
 */
describe('Property 2: Registration Creates Owner Membership', () => {
  // In-memory stores for testing registration flow
  class InMemoryUserStore {
    private users: Map<number, { 
      id: number; 
      email: string; 
      firstName: string;
      lastName: string;
      activeOrganizationId: number | null;
    }> = new Map();
    private userIdCounter = 1;
    private emailIndex: Map<string, number> = new Map();

    create(data: { email: string; firstName: string; lastName: string }): { id: number; email: string; firstName: string; lastName: string; activeOrganizationId: number | null } {
      if (this.emailIndex.has(data.email)) {
        throw new Error('User with this email already exists');
      }
      const user = {
        id: this.userIdCounter++,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        activeOrganizationId: null,
      };
      this.users.set(user.id, user);
      this.emailIndex.set(data.email, user.id);
      return user;
    }

    findById(id: number) {
      return this.users.get(id) || null;
    }

    findByEmail(email: string) {
      const userId = this.emailIndex.get(email);
      return userId ? this.users.get(userId) || null : null;
    }

    update(id: number, data: Partial<{ activeOrganizationId: number | null }>) {
      const user = this.users.get(id);
      if (user) {
        Object.assign(user, data);
      }
      return user;
    }

    clear() {
      this.users.clear();
      this.emailIndex.clear();
      this.userIdCounter = 1;
    }
  }

  class InMemoryOrganizationStore {
    private organizations: Map<number, { id: number; name: string; ownerId: number }> = new Map();
    private orgIdCounter = 1;

    create(data: { name: string; ownerId: number }): { id: number; name: string; ownerId: number } {
      const org = {
        id: this.orgIdCounter++,
        name: data.name,
        ownerId: data.ownerId,
      };
      this.organizations.set(org.id, org);
      return org;
    }

    findById(id: number) {
      return this.organizations.get(id) || null;
    }

    findByOwnerId(ownerId: number) {
      return Array.from(this.organizations.values()).filter(o => o.ownerId === ownerId);
    }

    clear() {
      this.organizations.clear();
      this.orgIdCounter = 1;
    }
  }

  let userStore: InMemoryUserStore;
  let orgStore: InMemoryOrganizationStore;
  let membershipStore: InMemoryMembershipStore;

  // Simulate registration flow
  const simulateRegistration = (
    email: string, 
    firstName: string, 
    lastName: string
  ): { user: any; organization: any; membership: any } => {
    // 1. Create user
    const user = userStore.create({ email, firstName, lastName });

    // 2. Create organization for the user
    const orgName = `${firstName} ${lastName}`.trim() || 'My Organization';
    const organization = orgStore.create({ name: orgName, ownerId: user.id });

    // 3. Create membership with role 'owner'
    const membership = membershipStore.create({
      userId: user.id,
      organizationId: organization.id,
      role: 'owner',
      joinedAt: new Date(),
      invitedBy: null,
    });

    // 4. Set activeOrganizationId
    userStore.update(user.id, { activeOrganizationId: organization.id });

    return { user: userStore.findById(user.id), organization, membership };
  };

  beforeEach(() => {
    userStore = new InMemoryUserStore();
    orgStore = new InMemoryOrganizationStore();
    membershipStore = new InMemoryMembershipStore();
  });

  it('should create exactly one organization with owner role for new user', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (email, firstName, lastName) => {
          userStore.clear();
          orgStore.clear();
          membershipStore.clear();

          const { user, organization, membership } = simulateRegistration(email, firstName, lastName);

          // Property: User should exist
          expect(user).not.toBeNull();

          // Property: Exactly one organization should be created for this user
          const userOrgs = orgStore.findByOwnerId(user.id);
          expect(userOrgs.length).toBe(1);

          // Property: User should be owner of the organization
          expect(organization.ownerId).toBe(user.id);

          // Property: Exactly one membership should exist for the user
          const userMemberships = membershipStore.findByUserId(user.id);
          expect(userMemberships.length).toBe(1);

          // Property: Membership should have role 'owner'
          expect(membership.role).toBe('owner');

          // Property: Membership should be for the created organization
          expect(membership.organizationId).toBe(organization.id);

          // Property: activeOrganizationId should be set to the new organization
          expect(user.activeOrganizationId).toBe(organization.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not allow duplicate email registration', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (email, firstName, lastName) => {
          userStore.clear();
          orgStore.clear();
          membershipStore.clear();

          // First registration should succeed
          simulateRegistration(email, firstName, lastName);

          // Second registration with same email should fail
          expect(() => {
            simulateRegistration(email, 'Another', 'User');
          }).toThrow('User with this email already exists');

          // Property: Only one user should exist
          expect(userStore.findByEmail(email)).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create organization with correct name based on user name', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (email, firstName, lastName) => {
          userStore.clear();
          orgStore.clear();
          membershipStore.clear();

          const { organization } = simulateRegistration(email, firstName, lastName);

          // Property: Organization name should contain user's name
          const expectedName = `${firstName} ${lastName}`.trim();
          expect(organization.name).toBe(expectedName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 7: Invitation Acceptance Preserves Account
 * 
 * *For any* existing user accepting an organization invitation, their user account 
 * should remain unchanged (same id, email, password), and they should gain exactly 
 * one new membership.
 * 
 * **Validates: Requirements 5.2, 5.4**
 */
describe('Property 7: Invitation Acceptance Preserves Account', () => {
  // Extended in-memory stores for invitation flow testing
  class InMemoryUserStore {
    private users: Map<number, { 
      id: number; 
      email: string; 
      firstName: string;
      lastName: string;
      password: string;
      activeOrganizationId: number | null;
    }> = new Map();
    private userIdCounter = 1;
    private emailIndex: Map<string, number> = new Map();

    create(data: { email: string; firstName: string; lastName: string; password: string }): { 
      id: number; 
      email: string; 
      firstName: string; 
      lastName: string; 
      password: string;
      activeOrganizationId: number | null;
    } {
      if (this.emailIndex.has(data.email)) {
        throw new Error('User with this email already exists');
      }
      const user = {
        id: this.userIdCounter++,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        activeOrganizationId: null,
      };
      this.users.set(user.id, user);
      this.emailIndex.set(data.email, user.id);
      return user;
    }

    findById(id: number) {
      return this.users.get(id) || null;
    }

    findByEmail(email: string) {
      const userId = this.emailIndex.get(email);
      return userId ? this.users.get(userId) || null : null;
    }

    update(id: number, data: Partial<{ activeOrganizationId: number | null }>) {
      const user = this.users.get(id);
      if (user) {
        Object.assign(user, data);
      }
      return user;
    }

    clear() {
      this.users.clear();
      this.emailIndex.clear();
      this.userIdCounter = 1;
    }
  }

  class InMemoryOrganizationStore {
    private organizations: Map<number, { id: number; name: string; ownerId: number }> = new Map();
    private orgIdCounter = 1;

    create(data: { name: string; ownerId: number }): { id: number; name: string; ownerId: number } {
      const org = {
        id: this.orgIdCounter++,
        name: data.name,
        ownerId: data.ownerId,
      };
      this.organizations.set(org.id, org);
      return org;
    }

    findById(id: number) {
      return this.organizations.get(id) || null;
    }

    clear() {
      this.organizations.clear();
      this.orgIdCounter = 1;
    }
  }

  class InMemoryInvitationStore {
    private invitations: Map<string, { 
      id: number;
      token: string; 
      email: string; 
      organizationId: number; 
      role: string;
      invitedBy: number;
      accepted: boolean;
    }> = new Map();
    private invitationIdCounter = 1;

    create(data: { email: string; organizationId: number; role: string; invitedBy: number }): { 
      id: number;
      token: string; 
      email: string; 
      organizationId: number; 
      role: string;
      invitedBy: number;
      accepted: boolean;
    } {
      const token = `token_${this.invitationIdCounter}`;
      const invitation = {
        id: this.invitationIdCounter++,
        token,
        email: data.email,
        organizationId: data.organizationId,
        role: data.role,
        invitedBy: data.invitedBy,
        accepted: false,
      };
      this.invitations.set(token, invitation);
      return invitation;
    }

    findByToken(token: string) {
      return this.invitations.get(token) || null;
    }

    accept(token: string) {
      const invitation = this.invitations.get(token);
      if (invitation) {
        invitation.accepted = true;
      }
    }

    clear() {
      this.invitations.clear();
      this.invitationIdCounter = 1;
    }
  }

  let userStore: InMemoryUserStore;
  let orgStore: InMemoryOrganizationStore;
  let membershipStore: InMemoryMembershipStore;
  let invitationStore: InMemoryInvitationStore;

  // Simulate accepting invitation for existing user
  const simulateInvitationAcceptance = (
    existingUser: { id: number; email: string; firstName: string; lastName: string; password: string },
    invitationToken: string
  ): { user: any; newMembership: any } => {
    const invitation = invitationStore.findByToken(invitationToken);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.email !== existingUser.email) {
      throw new Error('Invitation email does not match user email');
    }

    // Check if already a member
    const existingMembership = membershipStore.findByUserAndOrg(existingUser.id, invitation.organizationId);
    if (existingMembership) {
      throw new Error('User is already a member of this organization');
    }

    // Create new membership (user account remains unchanged)
    const newMembership = membershipStore.create({
      userId: existingUser.id,
      organizationId: invitation.organizationId,
      role: invitation.role as 'owner' | 'admin' | 'member',
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    invitationStore.accept(invitationToken);

    // Return the unchanged user and new membership
    return { 
      user: userStore.findById(existingUser.id), 
      newMembership 
    };
  };

  beforeEach(() => {
    userStore = new InMemoryUserStore();
    orgStore = new InMemoryOrganizationStore();
    membershipStore = new InMemoryMembershipStore();
    invitationStore = new InMemoryInvitationStore();
  });

  it('should preserve user account when accepting invitation', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.constantFrom('admin', 'member') as fc.Arbitrary<'admin' | 'member'>,
        (email, firstName, lastName, password, orgName, inviteRole) => {
          userStore.clear();
          orgStore.clear();
          membershipStore.clear();
          invitationStore.clear();

          // Setup: Create existing user with their own organization
          const existingUser = userStore.create({ email, firstName, lastName, password });
          const userOrg = orgStore.create({ name: `${firstName}'s Org`, ownerId: existingUser.id });
          membershipStore.create({
            userId: existingUser.id,
            organizationId: userOrg.id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });
          userStore.update(existingUser.id, { activeOrganizationId: userOrg.id });

          // Setup: Create another user who will invite
          const inviterUser = userStore.create({ 
            email: `inviter_${email}`, 
            firstName: 'Inviter', 
            lastName: 'User',
            password: 'inviterpass123'
          });
          const inviterOrg = orgStore.create({ name: orgName, ownerId: inviterUser.id });
          membershipStore.create({
            userId: inviterUser.id,
            organizationId: inviterOrg.id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // Create invitation
          const invitation = invitationStore.create({
            email: existingUser.email,
            organizationId: inviterOrg.id,
            role: inviteRole,
            invitedBy: inviterUser.id,
          });

          // Record user state before acceptance
          const userBefore = { ...userStore.findById(existingUser.id)! };
          const membershipCountBefore = membershipStore.findByUserId(existingUser.id).length;

          // Accept invitation
          const { user: userAfter, newMembership } = simulateInvitationAcceptance(
            existingUser,
            invitation.token
          );

          // Property: User ID should remain unchanged
          expect(userAfter.id).toBe(userBefore.id);

          // Property: User email should remain unchanged
          expect(userAfter.email).toBe(userBefore.email);

          // Property: User password should remain unchanged
          expect(userAfter.password).toBe(userBefore.password);

          // Property: User firstName should remain unchanged
          expect(userAfter.firstName).toBe(userBefore.firstName);

          // Property: User lastName should remain unchanged
          expect(userAfter.lastName).toBe(userBefore.lastName);

          // Property: Membership count should increase by exactly 1
          const membershipCountAfter = membershipStore.findByUserId(existingUser.id).length;
          expect(membershipCountAfter).toBe(membershipCountBefore + 1);

          // Property: New membership should be for the inviting organization
          expect(newMembership.organizationId).toBe(inviterOrg.id);

          // Property: New membership should have the invited role
          expect(newMembership.role).toBe(inviteRole);

          // Property: New membership should reference the inviter
          expect(newMembership.invitedBy).toBe(inviterUser.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not create duplicate membership when accepting invitation twice', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (email, firstName, lastName) => {
          userStore.clear();
          orgStore.clear();
          membershipStore.clear();
          invitationStore.clear();

          // Setup: Create existing user
          const existingUser = userStore.create({ email, firstName, lastName, password: 'password123' });
          const userOrg = orgStore.create({ name: `${firstName}'s Org`, ownerId: existingUser.id });
          membershipStore.create({
            userId: existingUser.id,
            organizationId: userOrg.id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // Setup: Create inviter and their organization
          const inviterUser = userStore.create({ 
            email: `inviter_${email}`, 
            firstName: 'Inviter', 
            lastName: 'User',
            password: 'inviterpass123'
          });
          const inviterOrg = orgStore.create({ name: 'Inviter Org', ownerId: inviterUser.id });
          membershipStore.create({
            userId: inviterUser.id,
            organizationId: inviterOrg.id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // Create invitation
          const invitation = invitationStore.create({
            email: existingUser.email,
            organizationId: inviterOrg.id,
            role: 'member',
            invitedBy: inviterUser.id,
          });

          // First acceptance should succeed
          simulateInvitationAcceptance(existingUser, invitation.token);

          // Create another invitation for the same org
          const invitation2 = invitationStore.create({
            email: existingUser.email,
            organizationId: inviterOrg.id,
            role: 'admin',
            invitedBy: inviterUser.id,
          });

          // Second acceptance should fail (already a member)
          expect(() => {
            simulateInvitationAcceptance(existingUser, invitation2.token);
          }).toThrow('User is already a member of this organization');

          // Property: User should still have exactly 2 memberships (own org + invited org)
          expect(membershipStore.findByUserId(existingUser.id).length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow user to be member of multiple organizations', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 2, max: 5 }),
        (email, firstName, lastName, numInvitations) => {
          userStore.clear();
          orgStore.clear();
          membershipStore.clear();
          invitationStore.clear();

          // Setup: Create existing user with their own organization
          const existingUser = userStore.create({ email, firstName, lastName, password: 'password123' });
          const userOrg = orgStore.create({ name: `${firstName}'s Org`, ownerId: existingUser.id });
          membershipStore.create({
            userId: existingUser.id,
            organizationId: userOrg.id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // Create multiple inviters and accept their invitations
          for (let i = 0; i < numInvitations; i++) {
            const inviterUser = userStore.create({ 
              email: `inviter${i}_${email}`, 
              firstName: `Inviter${i}`, 
              lastName: 'User',
              password: 'inviterpass123'
            });
            const inviterOrg = orgStore.create({ name: `Org ${i}`, ownerId: inviterUser.id });
            membershipStore.create({
              userId: inviterUser.id,
              organizationId: inviterOrg.id,
              role: 'owner',
              joinedAt: new Date(),
              invitedBy: null,
            });

            const invitation = invitationStore.create({
              email: existingUser.email,
              organizationId: inviterOrg.id,
              role: 'member',
              invitedBy: inviterUser.id,
            });

            simulateInvitationAcceptance(existingUser, invitation.token);
          }

          // Property: User should have exactly (1 + numInvitations) memberships
          const userMemberships = membershipStore.findByUserId(existingUser.id);
          expect(userMemberships.length).toBe(1 + numInvitations);

          // Property: User should be owner of exactly 1 organization
          const ownerMemberships = userMemberships.filter(m => m.role === 'owner');
          expect(ownerMemberships.length).toBe(1);

          // Property: User should be member of exactly numInvitations organizations
          const memberMemberships = userMemberships.filter(m => m.role === 'member');
          expect(memberMemberships.length).toBe(numInvitations);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 5: Subscription Isolation
 * 
 * *For any* user belonging to multiple organizations with different subscription plans,
 * feature access checks should use only the active organization's subscription,
 * not any other organization's subscription.
 * 
 * **Validates: Requirements 4.3, 4.5**
 */
describe('Property 5: Subscription Isolation', () => {
  // In-memory stores for testing subscription isolation
  interface Subscription {
    id: number;
    organizationId: number;
    planType: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'trial' | 'expired';
    features: string[];
    maxAccounts: number;
    maxTransactions: number;
  }

  class InMemorySubscriptionStore {
    private subscriptions: Map<number, Subscription> = new Map();
    private subscriptionIdCounter = 1;

    create(data: Omit<Subscription, 'id'>): Subscription {
      const subscription: Subscription = {
        ...data,
        id: this.subscriptionIdCounter++,
      };
      this.subscriptions.set(subscription.organizationId, subscription);
      return subscription;
    }

    findByOrganizationId(organizationId: number): Subscription | null {
      return this.subscriptions.get(organizationId) || null;
    }

    clear(): void {
      this.subscriptions.clear();
      this.subscriptionIdCounter = 1;
    }
  }

  class InMemoryUserStore {
    private users: Map<number, { id: number; activeOrganizationId: number | null }> = new Map();
    private userIdCounter = 1;

    create(): { id: number; activeOrganizationId: number | null } {
      const user = { id: this.userIdCounter++, activeOrganizationId: null };
      this.users.set(user.id, user);
      return user;
    }

    setActiveOrganization(userId: number, organizationId: number | null): void {
      const user = this.users.get(userId);
      if (user) {
        user.activeOrganizationId = organizationId;
      }
    }

    getActiveOrganization(userId: number): number | null {
      return this.users.get(userId)?.activeOrganizationId || null;
    }

    clear(): void {
      this.users.clear();
      this.userIdCounter = 1;
    }
  }

  // Plan configurations for testing
  const PLAN_CONFIGS = {
    free: { features: [], maxAccounts: 1, maxTransactions: 50 },
    basic: { features: ['reports_basic'], maxAccounts: 5, maxTransactions: 500 },
    premium: { features: ['reports_basic', 'reports_advanced', 'team_members'], maxAccounts: 10, maxTransactions: 2000 },
    enterprise: { features: ['reports_basic', 'reports_advanced', 'team_members', 'api_access', 'support_dedicated'], maxAccounts: -1, maxTransactions: -1 },
  };

  let subscriptionStore: InMemorySubscriptionStore;
  let userStore: InMemoryUserStore;
  let membershipStore: InMemoryMembershipStore;

  // Simulate getting access info based on active organization
  const getAccessInfo = (userId: number): { 
    planType: string; 
    features: string[]; 
    maxAccounts: number; 
    maxTransactions: number;
  } | null => {
    const activeOrgId = userStore.getActiveOrganization(userId);
    if (!activeOrgId) return null;

    // Verify user is member of active organization
    const membership = membershipStore.findByUserAndOrg(userId, activeOrgId);
    if (!membership) return null;

    const subscription = subscriptionStore.findByOrganizationId(activeOrgId);
    if (!subscription || subscription.status === 'expired') {
      return { planType: 'free', ...PLAN_CONFIGS.free };
    }

    return {
      planType: subscription.planType,
      features: subscription.features,
      maxAccounts: subscription.maxAccounts,
      maxTransactions: subscription.maxTransactions,
    };
  };

  // Simulate checking feature access
  const hasFeature = (userId: number, featureKey: string): boolean => {
    const accessInfo = getAccessInfo(userId);
    if (!accessInfo) return false;
    return accessInfo.features.includes(featureKey);
  };

  beforeEach(() => {
    subscriptionStore = new InMemorySubscriptionStore();
    userStore = new InMemoryUserStore();
    membershipStore = new InMemoryMembershipStore();
  });

  const planTypeArb = fc.constantFrom('free', 'basic', 'premium', 'enterprise') as fc.Arbitrary<'free' | 'basic' | 'premium' | 'enterprise'>;
  const statusArb = fc.constantFrom('active', 'trial') as fc.Arbitrary<'active' | 'trial'>;

  it('should use only active organization subscription for feature access', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          planType: planTypeArb,
          status: statusArb,
        }), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (orgConfigs, activeOrgIndex) => {
          subscriptionStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create organizations with different subscriptions
          const organizations: number[] = [];
          for (let i = 0; i < orgConfigs.length; i++) {
            const orgId = i + 1;
            organizations.push(orgId);

            // Create membership
            membershipStore.create({
              userId: user.id,
              organizationId: orgId,
              role: i === 0 ? 'owner' : 'member',
              joinedAt: new Date(),
              invitedBy: null,
            });

            // Create subscription for organization
            const config = PLAN_CONFIGS[orgConfigs[i].planType];
            subscriptionStore.create({
              organizationId: orgId,
              planType: orgConfigs[i].planType,
              status: orgConfigs[i].status,
              features: config.features,
              maxAccounts: config.maxAccounts,
              maxTransactions: config.maxTransactions,
            });
          }

          // Set active organization
          const activeIndex = activeOrgIndex % organizations.length;
          const activeOrgId = organizations[activeIndex];
          userStore.setActiveOrganization(user.id, activeOrgId);

          // Get access info
          const accessInfo = getAccessInfo(user.id);

          // Property: Access info should match active organization's subscription
          expect(accessInfo).not.toBeNull();
          expect(accessInfo!.planType).toBe(orgConfigs[activeIndex].planType);

          // Property: Features should match active organization's plan
          const expectedFeatures = PLAN_CONFIGS[orgConfigs[activeIndex].planType].features;
          expect(accessInfo!.features).toEqual(expectedFeatures);

          // Property: Limits should match active organization's plan
          const expectedLimits = PLAN_CONFIGS[orgConfigs[activeIndex].planType];
          expect(accessInfo!.maxAccounts).toBe(expectedLimits.maxAccounts);
          expect(accessInfo!.maxTransactions).toBe(expectedLimits.maxTransactions);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should change feature access when switching organizations', () => {
    fc.assert(
      fc.property(
        planTypeArb,
        planTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (plan1, plan2, featureToCheck) => {
          subscriptionStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create two organizations with different plans
          const org1Id = 1;
          const org2Id = 2;

          membershipStore.create({
            userId: user.id,
            organizationId: org1Id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          membershipStore.create({
            userId: user.id,
            organizationId: org2Id,
            role: 'member',
            joinedAt: new Date(),
            invitedBy: null,
          });

          subscriptionStore.create({
            organizationId: org1Id,
            planType: plan1,
            status: 'active',
            ...PLAN_CONFIGS[plan1],
          });

          subscriptionStore.create({
            organizationId: org2Id,
            planType: plan2,
            status: 'active',
            ...PLAN_CONFIGS[plan2],
          });

          // Set active to org1
          userStore.setActiveOrganization(user.id, org1Id);
          const accessInfo1 = getAccessInfo(user.id);

          // Switch to org2
          userStore.setActiveOrganization(user.id, org2Id);
          const accessInfo2 = getAccessInfo(user.id);

          // Property: Access info should change based on active organization
          expect(accessInfo1!.planType).toBe(plan1);
          expect(accessInfo2!.planType).toBe(plan2);

          // Property: Features should change based on active organization
          expect(accessInfo1!.features).toEqual(PLAN_CONFIGS[plan1].features);
          expect(accessInfo2!.features).toEqual(PLAN_CONFIGS[plan2].features);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not allow access to features from non-active organization subscriptions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('reports_advanced', 'team_members', 'api_access', 'support_dedicated'),
        (premiumFeature) => {
          subscriptionStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create free organization (active)
          const freeOrgId = 1;
          membershipStore.create({
            userId: user.id,
            organizationId: freeOrgId,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });
          subscriptionStore.create({
            organizationId: freeOrgId,
            planType: 'free',
            status: 'active',
            ...PLAN_CONFIGS.free,
          });

          // Create enterprise organization (not active)
          const enterpriseOrgId = 2;
          membershipStore.create({
            userId: user.id,
            organizationId: enterpriseOrgId,
            role: 'member',
            joinedAt: new Date(),
            invitedBy: null,
          });
          subscriptionStore.create({
            organizationId: enterpriseOrgId,
            planType: 'enterprise',
            status: 'active',
            ...PLAN_CONFIGS.enterprise,
          });

          // Set active to free organization
          userStore.setActiveOrganization(user.id, freeOrgId);

          // Property: Should NOT have access to premium features even though user is member of enterprise org
          expect(hasFeature(user.id, premiumFeature)).toBe(false);

          // Switch to enterprise organization
          userStore.setActiveOrganization(user.id, enterpriseOrgId);

          // Property: Should NOW have access to premium features
          expect(hasFeature(user.id, premiumFeature)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 6: Data Isolation by Organization
 * 
 * *For any* data creation or query operation, the data should be associated with
 * and filtered by the active organization only. A user should never see or create
 * data in an organization they don't belong to.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
describe('Property 6: Data Isolation by Organization', () => {
  // In-memory data stores for testing data isolation
  interface DataItem {
    id: number;
    organizationId: number;
    userId: number;
    name: string;
    createdAt: Date;
  }

  class InMemoryDataStore {
    private items: Map<number, DataItem> = new Map();
    private itemIdCounter = 1;

    create(data: Omit<DataItem, 'id' | 'createdAt'>): DataItem {
      const item: DataItem = {
        ...data,
        id: this.itemIdCounter++,
        createdAt: new Date(),
      };
      this.items.set(item.id, item);
      return item;
    }

    findByOrganizationId(organizationId: number): DataItem[] {
      return Array.from(this.items.values()).filter(item => item.organizationId === organizationId);
    }

    findById(id: number): DataItem | null {
      return this.items.get(id) || null;
    }

    delete(id: number): boolean {
      return this.items.delete(id);
    }

    clear(): void {
      this.items.clear();
      this.itemIdCounter = 1;
    }

    count(): number {
      return this.items.size;
    }
  }

  class InMemoryUserStore {
    private users: Map<number, { id: number; activeOrganizationId: number | null }> = new Map();
    private userIdCounter = 1;

    create(): { id: number; activeOrganizationId: number | null } {
      const user = { id: this.userIdCounter++, activeOrganizationId: null };
      this.users.set(user.id, user);
      return user;
    }

    setActiveOrganization(userId: number, organizationId: number | null): void {
      const user = this.users.get(userId);
      if (user) {
        user.activeOrganizationId = organizationId;
      }
    }

    getActiveOrganization(userId: number): number | null {
      return this.users.get(userId)?.activeOrganizationId || null;
    }

    clear(): void {
      this.users.clear();
      this.userIdCounter = 1;
    }
  }

  let dataStore: InMemoryDataStore;
  let userStore: InMemoryUserStore;
  let membershipStore: InMemoryMembershipStore;

  // Simulate data service operations with organization isolation
  const createData = (userId: number, name: string): DataItem | null => {
    const activeOrgId = userStore.getActiveOrganization(userId);
    if (!activeOrgId) return null;

    // Verify user is member of active organization
    const membership = membershipStore.findByUserAndOrg(userId, activeOrgId);
    if (!membership) return null;

    return dataStore.create({
      organizationId: activeOrgId,
      userId,
      name,
    });
  };

  const queryData = (userId: number): DataItem[] => {
    const activeOrgId = userStore.getActiveOrganization(userId);
    if (!activeOrgId) return [];

    // Verify user is member of active organization
    const membership = membershipStore.findByUserAndOrg(userId, activeOrgId);
    if (!membership) return [];

    return dataStore.findByOrganizationId(activeOrgId);
  };

  const getDataById = (userId: number, dataId: number): DataItem | null => {
    const activeOrgId = userStore.getActiveOrganization(userId);
    if (!activeOrgId) return null;

    // Verify user is member of active organization
    const membership = membershipStore.findByUserAndOrg(userId, activeOrgId);
    if (!membership) return null;

    const item = dataStore.findById(dataId);
    if (!item || item.organizationId !== activeOrgId) return null;

    return item;
  };

  beforeEach(() => {
    dataStore = new InMemoryDataStore();
    userStore = new InMemoryUserStore();
    membershipStore = new InMemoryMembershipStore();
  });

  it('should associate created data with active organization', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (orgIds, dataName) => {
          dataStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create memberships for unique organizations
          const uniqueOrgIds = [...new Set(orgIds)];
          for (const orgId of uniqueOrgIds) {
            membershipStore.create({
              userId: user.id,
              organizationId: orgId,
              role: 'member',
              joinedAt: new Date(),
              invitedBy: null,
            });
          }

          // Set active organization
          const activeOrgId = uniqueOrgIds[0];
          userStore.setActiveOrganization(user.id, activeOrgId);

          // Create data
          const createdItem = createData(user.id, dataName);

          // Property: Created data should be associated with active organization
          expect(createdItem).not.toBeNull();
          expect(createdItem!.organizationId).toBe(activeOrgId);
          expect(createdItem!.userId).toBe(user.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only return data from active organization', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (dataCountOrg1, dataCountOrg2) => {
          dataStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create two organizations
          const org1Id = 1;
          const org2Id = 2;

          membershipStore.create({
            userId: user.id,
            organizationId: org1Id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          membershipStore.create({
            userId: user.id,
            organizationId: org2Id,
            role: 'member',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // Create data in org1
          userStore.setActiveOrganization(user.id, org1Id);
          for (let i = 0; i < dataCountOrg1; i++) {
            createData(user.id, `org1-item-${i}`);
          }

          // Create data in org2
          userStore.setActiveOrganization(user.id, org2Id);
          for (let i = 0; i < dataCountOrg2; i++) {
            createData(user.id, `org2-item-${i}`);
          }

          // Query data from org1
          userStore.setActiveOrganization(user.id, org1Id);
          const org1Data = queryData(user.id);

          // Property: Should only see org1 data
          expect(org1Data.length).toBe(dataCountOrg1);
          for (const item of org1Data) {
            expect(item.organizationId).toBe(org1Id);
            expect(item.name.startsWith('org1-')).toBe(true);
          }

          // Query data from org2
          userStore.setActiveOrganization(user.id, org2Id);
          const org2Data = queryData(user.id);

          // Property: Should only see org2 data
          expect(org2Data.length).toBe(dataCountOrg2);
          for (const item of org2Data) {
            expect(item.organizationId).toBe(org2Id);
            expect(item.name.startsWith('org2-')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not allow access to data from non-member organizations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (dataName) => {
          dataStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create two users
          const user1 = userStore.create();
          const user2 = userStore.create();

          // Create organizations - user1 owns org1, user2 owns org2
          const org1Id = 1;
          const org2Id = 2;

          membershipStore.create({
            userId: user1.id,
            organizationId: org1Id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          membershipStore.create({
            userId: user2.id,
            organizationId: org2Id,
            role: 'owner',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // User1 creates data in org1
          userStore.setActiveOrganization(user1.id, org1Id);
          const createdItem = createData(user1.id, dataName);
          expect(createdItem).not.toBeNull();

          // User2 tries to access org1's data (should fail - not a member)
          userStore.setActiveOrganization(user2.id, org1Id);
          const user2QueryResult = queryData(user2.id);

          // Property: User2 should not see org1's data (not a member)
          expect(user2QueryResult.length).toBe(0);

          // Property: User2 should not be able to get specific item from org1
          const user2GetResult = getDataById(user2.id, createdItem!.id);
          expect(user2GetResult).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve data when user is removed from organization', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (dataCount) => {
          dataStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create organization
          const orgId = 1;
          membershipStore.create({
            userId: user.id,
            organizationId: orgId,
            role: 'member',
            joinedAt: new Date(),
            invitedBy: null,
          });

          // Create data
          userStore.setActiveOrganization(user.id, orgId);
          const createdItems: DataItem[] = [];
          for (let i = 0; i < dataCount; i++) {
            const item = createData(user.id, `item-${i}`);
            if (item) createdItems.push(item);
          }

          // Verify data was created
          expect(createdItems.length).toBe(dataCount);

          // Remove user from organization
          membershipStore.delete(user.id, orgId);

          // Property: Data should still exist in the organization (not deleted)
          const orgData = dataStore.findByOrganizationId(orgId);
          expect(orgData.length).toBe(dataCount);

          // Property: User should no longer be able to access the data
          const userQueryResult = queryData(user.id);
          expect(userQueryResult.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow multiple users in same organization to see shared data', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (userCount, dataPerUser) => {
          dataStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create shared organization
          const sharedOrgId = 1;

          // Create users and add them to the organization
          const users: { id: number; activeOrganizationId: number | null }[] = [];
          for (let i = 0; i < userCount; i++) {
            const user = userStore.create();
            users.push(user);
            membershipStore.create({
              userId: user.id,
              organizationId: sharedOrgId,
              role: i === 0 ? 'owner' : 'member',
              joinedAt: new Date(),
              invitedBy: null,
            });
            userStore.setActiveOrganization(user.id, sharedOrgId);
          }

          // Each user creates data
          for (const user of users) {
            for (let i = 0; i < dataPerUser; i++) {
              createData(user.id, `user${user.id}-item-${i}`);
            }
          }

          const totalExpectedData = userCount * dataPerUser;

          // Property: Each user should see all data in the organization
          for (const user of users) {
            const userData = queryData(user.id);
            expect(userData.length).toBe(totalExpectedData);

            // All data should belong to the shared organization
            for (const item of userData) {
              expect(item.organizationId).toBe(sharedOrgId);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly filter data when switching between organizations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 5 }),
        (dataCounts) => {
          dataStore.clear();
          userStore.clear();
          membershipStore.clear();

          // Create user
          const user = userStore.create();

          // Create organizations and data
          const organizations: number[] = [];
          for (let i = 0; i < dataCounts.length; i++) {
            const orgId = i + 1;
            organizations.push(orgId);

            membershipStore.create({
              userId: user.id,
              organizationId: orgId,
              role: i === 0 ? 'owner' : 'member',
              joinedAt: new Date(),
              invitedBy: null,
            });

            // Create data for this organization
            userStore.setActiveOrganization(user.id, orgId);
            for (let j = 0; j < dataCounts[i]; j++) {
              createData(user.id, `org${orgId}-item-${j}`);
            }
          }

          // Switch between organizations and verify data isolation
          for (let i = 0; i < organizations.length; i++) {
            const orgId = organizations[i];
            userStore.setActiveOrganization(user.id, orgId);

            const data = queryData(user.id);

            // Property: Should only see data from current active organization
            expect(data.length).toBe(dataCounts[i]);
            for (const item of data) {
              expect(item.organizationId).toBe(orgId);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
