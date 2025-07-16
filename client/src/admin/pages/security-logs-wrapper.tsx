import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import SecurityLogsPage from './security-logs';

export default function SecurityLogsWrapper() {
  return (
    <AdminLayout>
      <SecurityLogsPage />
    </AdminLayout>
  );
}