export const ADMIN_PERMISSIONS = {
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
    MANAGE_METHODS: 'payments.manage_methods',
    PROCESS_REFUNDS: 'payments.process_refunds'
  },
  CAMPAIGNS: {
    VIEW: 'campaigns.view',
    CREATE: 'campaigns.create',
    UPDATE: 'campaigns.update',
    DELETE: 'campaigns.delete'
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
  }
};

export const ROLE_PERMISSIONS = {
  super_admin: Object.values(ADMIN_PERMISSIONS).flatMap(group => Object.values(group)),
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