# Implementation Plan: Multi-Organization Membership

## Overview

Este plano implementa a funcionalidade de múltiplas organizações por utilizador, permitindo que um utilizador pertença a várias organizações e alterne entre elas. A implementação segue uma abordagem incremental: primeiro a base de dados, depois o backend, e finalmente o frontend mobile.

## Tasks

- [x] 1. Database Schema and Migration
  - [x] 1.1 Create organization_memberships table migration
    - Create new migration file with organization_memberships table
    - Add indexes for user_id and organization_id
    - Add unique constraint on (user_id, organization_id)
    - _Requirements: 1.1, 1.4_

  - [x] 1.2 Add active_organization_id to users table
    - Create migration to add active_organization_id column
    - Add foreign key reference to organizations
    - _Requirements: 3.1_

  - [x] 1.3 Update Drizzle schema with new table and relations
    - Add organizationMemberships table to schema.ts
    - Add relations for users, organizations, and memberships
    - Update users table with activeOrganizationId field
    - _Requirements: 1.1, 1.4, 3.1_

  - [x] 1.4 Create data migration script
    - Script to populate organization_memberships from existing users.organizationId
    - Set activeOrganizationId from existing organizationId
    - Preserve existing roles (owner/member)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 2. Backend Services - Organization Membership
  - [x] 2.1 Create OrganizationMembershipRepository
    - Implement findByUserId, findByOrganizationId
    - Implement create, delete methods
    - Implement findByUserAndOrg for membership check
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Create OrganizationMembershipService
    - Implement getUserMemberships(userId)
    - Implement addMember(orgId, userId, role, invitedBy)
    - Implement removeMember(orgId, userId)
    - Implement isMember(userId, orgId)
    - Implement getRole(userId, orgId)
    - _Requirements: 1.1, 1.3, 1.5, 2.1_

  - [x] 2.3 Write property tests for membership operations
    - **Property 1: Multi-Membership Consistency**
    - **Property 3: Membership Operations Are Additive**
    - **Validates: Requirements 1.1, 1.3, 1.4, 2.4**

- [x] 3. Backend Services - Organization Switching
  - [x] 3.1 Implement switchOrganization in OrganizationMembershipService
    - Verify user is member of target organization
    - Update user's activeOrganizationId
    - Return updated user with new active org
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Update auth middleware to use activeOrganizationId
    - Get activeOrganizationId from user
    - Verify membership, fallback if invalid
    - Set organizationId in request context
    - _Requirements: 3.1, 6.1_

  - [x] 3.3 Write property tests for organization switching
    - **Property 4: Active Organization Persistence**
    - **Validates: Requirements 3.2, 3.6**

- [x] 4. Backend Services - Auth Flow Updates
  - [x] 4.1 Update AuthService.register to create membership
    - Create organization for new user
    - Create membership with role 'owner'
    - Set activeOrganizationId
    - _Requirements: 1.2, 2.2_

  - [x] 4.2 Update AuthService.register for invitation flow
    - If invitation token provided, also add to inviting org
    - Create user's own org AND membership in inviting org
    - _Requirements: 5.4_

  - [x] 4.3 Update AuthService.login to return memberships
    - Include all memberships in response
    - Include active organization details
    - _Requirements: 3.4, 3.5_

  - [x] 4.4 Write property tests for registration flow
    - **Property 2: Registration Creates Owner Membership**
    - **Property 7: Invitation Acceptance Preserves Account**
    - **Validates: Requirements 1.2, 2.2, 5.2, 5.4**

- [x] 5. Backend API Endpoints
  - [x] 5.1 Create GET /api/organizations/my endpoint
    - Return all organizations user belongs to
    - Include role, subscription status, member count
    - Mark active organization
    - _Requirements: 3.4, 7.1, 7.2_

  - [x] 5.2 Create POST /api/organizations endpoint
    - Allow any user to create new organization
    - Create membership with role 'owner'
    - Optionally set subscription plan
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.3 Create POST /api/organizations/switch endpoint
    - Verify membership before switching
    - Update activeOrganizationId
    - Return updated user data
    - _Requirements: 3.3_

  - [x] 5.4 Create DELETE /api/organizations/:id/leave endpoint
    - Verify user is not owner
    - Remove membership
    - Switch to another org if leaving active org
    - _Requirements: 1.5, 7.5_

  - [x] 5.5 Write integration tests for organization endpoints
    - Test create, list, switch, leave flows
    - Test error cases (leave as owner, switch to non-member)
    - _Requirements: 2.1, 3.3, 7.5_

- [x] 6. Backend - Subscription and Access Control
  - [x] 6.1 Update PlanAccessService to use activeOrganizationId
    - Get subscription from active organization
    - Apply limits based on active org's plan
    - _Requirements: 4.3, 4.5_

  - [x] 6.2 Update all data services to use organizationId from context
    - Verify AccountService, TransactionService, etc. use req.organizationId
    - Ensure data isolation by organization
    - _Requirements: 6.1, 6.2_

  - [x] 6.3 Write property tests for data isolation
    - **Property 5: Subscription Isolation**
    - **Property 6: Data Isolation by Organization**
    - **Validates: Requirements 4.3, 6.1, 6.2, 6.3**

- [x] 7. Backend - Team Invitation Updates
  - [x] 7.1 Update invitation acceptance for existing users
    - Check if email already has account
    - If yes, add membership without creating new user
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Update invitation acceptance for new users
    - Create user account
    - Create user's own organization
    - Add membership to inviting organization
    - _Requirements: 5.3, 5.4_

  - [x] 7.3 Write tests for invitation flows
    - Test existing user invitation
    - Test new user invitation
    - Test duplicate email error
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Checkpoint - Backend Complete
  - Ensure all backend tests pass
  - Test API endpoints manually
  - Run migration on development database
  - Ask the user if questions arise

- [x] 9. Mobile - Auth Context Updates
  - [x] 9.1 Update AuthContext to store memberships
    - Add memberships array to user state
    - Add activeOrganization to state
    - Add switchOrganization function
    - _Requirements: 3.1, 3.4_

  - [x] 9.2 Update login/register to handle memberships
    - Parse memberships from API response
    - Set initial active organization
    - _Requirements: 3.2, 3.4_

  - [x] 9.3 Create organization switching API call
    - POST to /api/organizations/switch
    - Update local state on success
    - Refresh app data after switch
    - _Requirements: 3.3_

- [x] 10. Mobile - Organization Selector Component
  - [x] 10.1 Create OrganizationSelector component
    - Dropdown/modal showing all organizations
    - Display org name, role badge, subscription status
    - Highlight current active organization
    - _Requirements: 3.4, 3.5_

  - [x] 10.2 Add selector to app header or profile
    - Show current org name with dropdown indicator
    - On tap, show organization list
    - _Requirements: 3.4_

  - [x] 10.3 Implement organization switch flow
    - Call switchOrganization on selection
    - Show loading state during switch
    - Refresh all screens after switch
    - _Requirements: 3.3_

- [x] 11. Mobile - Organizations Management Screen
  - [x] 11.1 Create OrganizationsScreen
    - List all user's organizations
    - Show role and subscription for each
    - Highlight active organization
    - _Requirements: 7.1, 7.2_

  - [x] 11.2 Add "Create Organization" functionality
    - Button to create new organization
    - Form for organization name
    - Plan selection (optional)
    - _Requirements: 2.1, 7.3_

  - [x] 11.3 Add "Leave Organization" functionality
    - Show leave button for non-owner orgs
    - Confirmation dialog
    - Handle active org switch if leaving active
    - _Requirements: 7.5_

  - [x] 11.4 Add navigation to Organizations screen
    - Add to Profile stack navigator
    - Add menu item in ProfileScreen
    - _Requirements: 7.1_

- [x] 12. Mobile - Team Management Updates
  - [x] 12.1 Update TeamScreen to show for owners only
    - Check user role in active organization
    - Show/hide team management based on role
    - _Requirements: 7.4_

  - [x] 12.2 Update invitation flow for existing users
    - Handle case where invited email already has account
    - Show appropriate message
    - _Requirements: 5.1, 5.2_

- [x] 13. Final Checkpoint
  - Ensure all tests pass
  - Test complete flows on mobile
  - Verify data isolation between organizations
  - Ask the user if questions arise

## Notes

- All tasks including tests are required for comprehensive quality
- Migration should be run carefully on production with backup
- Consider adding organization switching analytics
- Future: Add organization transfer ownership feature
