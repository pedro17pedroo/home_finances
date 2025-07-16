import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import CampaignsPage from './campaigns';

export default function CampaignsWrapper() {
  return (
    <AdminLayout>
      <CampaignsPage />
    </AdminLayout>
  );
}