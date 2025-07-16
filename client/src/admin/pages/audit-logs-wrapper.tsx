import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import AuditLogsPage from './audit-logs';

export default function AuditLogsWrapper() {
  return (
    <AdminLayout>
      <AuditLogsPage />
    </AdminLayout>
  );
}