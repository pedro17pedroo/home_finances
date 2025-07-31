export const ADMIN_PERMISSIONS = {
  // Existing old format for compatibility
  PLANS: {
    VIEW: 'plans.view',
    CREATE: 'plans.create',
    UPDATE: 'plans.update',
    DELETE: 'plans.delete',
    MANAGE_PRICING: 'plans.manage_pricing'
  },
  USERS: {
    VIEW: 'users.view',
    CREATE: 'users.create',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    MANAGE_SUBSCRIPTIONS: 'users.manage_subscriptions'
  },
  PAYMENTS: {
    VIEW: 'payments.view',
    MANAGE: 'payments.manage',
    PROCESS_REFUNDS: 'payments.process_refunds'
  },
  CAMPAIGNS: {
    VIEW: 'campaigns.view',
    MANAGE: 'campaigns.manage'
  },
  CONTENT: {
    VIEW: 'content.view',
    MANAGE_LANDING: 'content.manage_landing',
    MANAGE_LEGAL: 'content.manage_legal'
  },
  SYSTEM: {
    VIEW_SETTINGS: 'system.view_settings',
    MANAGE_SETTINGS: 'system.manage_settings',
    VIEW_LOGS: 'system.view_logs'
  },
  // New simplified format used by backend
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  PLANS_READ: 'plans:read',
  PLANS_WRITE: 'plans:write',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_WRITE: 'campaigns:write',
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  ANALYTICS_READ: 'analytics:read',
  AUDIT_LOGS_READ: 'audit_logs:read',
  SECURITY_READ: 'security:read',
  SECURITY_WRITE: 'security:write'
};

export const ROLE_PERMISSIONS = {
  super_admin: [
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.manage_subscriptions',
    'plans.view', 'plans.create', 'plans.update', 'plans.delete', 'plans.manage_pricing',
    'payments.view', 'payments.manage', 'payments.process_refunds',
    'campaigns.view', 'campaigns.manage',
    'content.view', 'content.manage_landing', 'content.manage_legal',
    'system.view_settings', 'system.manage_settings', 'system.view_logs'
  ],
  admin: [
    ADMIN_PERMISSIONS.PLANS.VIEW,
    ADMIN_PERMISSIONS.USERS.VIEW,
    ADMIN_PERMISSIONS.USERS.MANAGE_SUBSCRIPTIONS,
    ADMIN_PERMISSIONS.PAYMENTS.VIEW,
    ADMIN_PERMISSIONS.CONTENT.VIEW,
    ADMIN_PERMISSIONS.SYSTEM.VIEW_SETTINGS,
    ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS
  ]
};

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};