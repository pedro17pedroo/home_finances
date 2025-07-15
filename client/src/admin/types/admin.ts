export interface AdminUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'super_admin' | 'admin';
  permissions: string[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  adminUserId: number;
  adminUser: AdminUser;
}

export interface AuditLog {
  id: number;
  adminUserId: number;
  action: string;
  entityType: string;
  entityId: number;
  oldData: any;
  newData: any;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: any;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  monthlyRevenue: number;
  trialConversionRate: number;
  churnRate: number;
  planDistribution: {
    basic: number;
    premium: number;
    enterprise: number;
  };
}