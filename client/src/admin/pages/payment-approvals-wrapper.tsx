import PaymentApprovals from "./payment-approvals";
import AdminLayout from "../components/layout/admin-layout";

export default function PaymentApprovalsWrapper() {
  return (
    <AdminLayout>
      <PaymentApprovals />
    </AdminLayout>
  );
}