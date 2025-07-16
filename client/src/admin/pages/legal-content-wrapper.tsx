import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import LegalContentPage from './legal-content';

export default function LegalContentWrapper() {
  return (
    <AdminLayout>
      <LegalContentPage />
    </AdminLayout>
  );
}