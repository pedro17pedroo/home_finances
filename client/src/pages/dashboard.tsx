import FinancialSummary from "@/components/dashboard/financial-summary";
import Charts from "@/components/dashboard/charts";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import SavingsGoals from "@/components/dashboard/savings-goals";
import Alerts from "@/components/dashboard/alerts";
import AccountManagement from "@/components/dashboard/account-management";
import SubscriptionNotifications from "@/components/subscription/SubscriptionNotifications";
import UsageLimits from "@/components/auth/usage-limits";
import { TrialStatus } from "@/components/system/trial-status";

export default function Dashboard() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TrialStatus />
      <SubscriptionNotifications />
      <FinancialSummary />
      <Charts />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <QuickActions />
        <RecentTransactions />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <SavingsGoals />
        <Alerts />
        <UsageLimits />
      </div>
      <AccountManagement />
    </main>
  );
}
