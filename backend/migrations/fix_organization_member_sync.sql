-- Migration: Fix organization member sync
-- This migration ensures all organization members have the same plan as the organization owner

-- Step 1: Update organization members to inherit plan from organization's active subscription
UPDATE users u
SET 
  plan_type = o.plan_type,
  subscription_status = o.subscription_status,
  updated_at = NOW()
FROM organizations o
WHERE u.organization_id = o.id
  AND u.role != 'owner';

-- Step 2: For organizations with active subscriptions, sync from subscription
UPDATE users u
SET 
  plan_type = p.type,
  subscription_status = CASE 
    WHEN s.status = 'active' THEN 'active'
    WHEN s.status = 'trial' THEN 'trialing'
    WHEN s.status = 'expired' THEN 'past_due'
    WHEN s.status = 'cancelled' THEN 'canceled'
    ELSE u.subscription_status
  END,
  updated_at = NOW()
FROM subscriptions s
JOIN plans p ON p.id = CAST(s.plan_id AS INTEGER)
WHERE s.organization_id = u.organization_id
  AND s.status IN ('active', 'trial')
  AND s.id = (
    SELECT id FROM subscriptions 
    WHERE organization_id = u.organization_id 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Step 3: Update organizations to match their active subscription
UPDATE organizations o
SET 
  plan_type = p.type,
  subscription_status = CASE 
    WHEN s.status = 'active' THEN 'active'
    WHEN s.status = 'trial' THEN 'trialing'
    WHEN s.status = 'expired' THEN 'past_due'
    WHEN s.status = 'cancelled' THEN 'canceled'
    ELSE o.subscription_status
  END,
  updated_at = NOW()
FROM subscriptions s
JOIN plans p ON p.id = CAST(s.plan_id AS INTEGER)
WHERE s.organization_id = o.id
  AND s.status IN ('active', 'trial')
  AND s.id = (
    SELECT id FROM subscriptions 
    WHERE organization_id = o.id 
    ORDER BY created_at DESC 
    LIMIT 1
  );
