import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import PlansPage from './plans';

export default function PlansWrapper() {
  return (
    <AdminLayout>
      <PlansPage />
    </AdminLayout>
  );
}