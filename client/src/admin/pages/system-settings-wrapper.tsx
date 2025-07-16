import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import SystemSettingsPage from './system-settings';

export default function SystemSettingsWrapper() {
  return (
    <AdminLayout>
      <SystemSettingsPage />
    </AdminLayout>
  );
}