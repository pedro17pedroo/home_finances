import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import LandingContentPage from './landing-content';

export default function LandingContentWrapper() {
  return (
    <AdminLayout>
      <LandingContentPage />
    </AdminLayout>
  );
}