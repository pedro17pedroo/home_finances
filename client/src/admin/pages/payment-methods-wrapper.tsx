import React from 'react';
import AdminLayout from '../components/layout/admin-layout';
import PaymentMethodsPage from './payment-methods';

export default function PaymentMethodsWrapper() {
  return (
    <AdminLayout>
      <PaymentMethodsPage />
    </AdminLayout>
  );
}