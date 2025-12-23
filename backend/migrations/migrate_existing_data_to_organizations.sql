-- Migration: Migrate existing data to organizations
-- This script creates organizations for users who don't have one
-- and populates organization_id in all data tables

-- Step 1: Create organizations for users without one
-- The organization name will be based on the user's name
INSERT INTO organizations (name, owner_id, plan_type, subscription_status, max_users, created_at, updated_at)
SELECT 
    CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as name,
    id as owner_id,
    COALESCE(plan_type, 'basic') as plan_type,
    COALESCE(subscription_status, 'trialing') as subscription_status,
    CASE 
        WHEN plan_type = 'enterprise' THEN 50
        WHEN plan_type = 'premium' THEN 10
        ELSE 1
    END as max_users,
    COALESCE(created_at, NOW()) as created_at,
    NOW() as updated_at
FROM users 
WHERE organization_id IS NULL
AND id NOT IN (SELECT owner_id FROM organizations WHERE owner_id IS NOT NULL);

-- Step 2: Update users with their new organization_id
UPDATE users u
SET organization_id = o.id
FROM organizations o
WHERE o.owner_id = u.id
AND u.organization_id IS NULL;

-- Step 3: Populate organization_id in accounts table
UPDATE accounts a
SET organization_id = u.organization_id
FROM users u
WHERE a.user_id = u.id
AND a.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 4: Populate organization_id in transactions table
UPDATE transactions t
SET organization_id = u.organization_id
FROM users u
WHERE t.user_id = u.id
AND t.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 5: Populate organization_id in categories table
UPDATE categories c
SET organization_id = u.organization_id
FROM users u
WHERE c.user_id = u.id
AND c.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 6: Populate organization_id in savings_goals table
UPDATE savings_goals sg
SET organization_id = u.organization_id
FROM users u
WHERE sg.user_id = u.id
AND sg.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 7: Populate organization_id in loans table
UPDATE loans l
SET organization_id = u.organization_id
FROM users u
WHERE l.user_id = u.id
AND l.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 8: Populate organization_id in debts table
UPDATE debts d
SET organization_id = u.organization_id
FROM users u
WHERE d.user_id = u.id
AND d.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 9: Populate organization_id in transfers table
UPDATE transfers t
SET organization_id = u.organization_id
FROM users u
WHERE t.user_id = u.id
AND t.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 10: Populate organization_id in subscriptions table
UPDATE subscriptions s
SET organization_id = u.organization_id
FROM users u
WHERE s.user_id = u.id
AND s.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 11: Populate organization_id in subscription_payments table
UPDATE subscription_payments sp
SET organization_id = u.organization_id
FROM users u
WHERE sp.user_id = u.id
AND sp.organization_id IS NULL
AND u.organization_id IS NOT NULL;

-- Step 12: Verify migration
SELECT 
    'accounts' as table_name,
    COUNT(*) as total,
    COUNT(organization_id) as with_org,
    COUNT(*) - COUNT(organization_id) as without_org
FROM accounts
UNION ALL
SELECT 'transactions', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM transactions
UNION ALL
SELECT 'categories', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM categories
UNION ALL
SELECT 'savings_goals', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM savings_goals
UNION ALL
SELECT 'loans', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM loans
UNION ALL
SELECT 'debts', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM debts
UNION ALL
SELECT 'transfers', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM transfers
UNION ALL
SELECT 'subscriptions', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM subscriptions;
