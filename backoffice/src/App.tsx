import { Route, Switch, Redirect } from 'wouter';
import { AdminAuthProvider, useAdminAuth } from './shared/contexts/admin-auth-context';
import { ThemeProvider } from './shared/contexts/theme-context';

// Pages
import { LoginPage } from './features/auth/pages/login-page';
import { ForgotPasswordPage } from './features/auth/pages/forgot-password-page';
import { ResetPasswordPage } from './features/auth/pages/reset-password-page';
import { DashboardPage } from './features/dashboard/pages/dashboard-page';
import { UsersPage } from './features/users/pages/users-page';
import { AdminsPage } from './features/admins/pages/admins-page';
import { PlansPage } from './features/plans/pages/plans-page';
import { SubscriptionsPage } from './features/subscriptions/pages/subscriptions-page';
import { CampaignsPage } from './features/campaigns/pages/campaigns-page';
import { PaymentsPage } from './features/payments/pages/payments-page';
import { PaymentMethodsPage } from './features/payments/pages/payment-methods-page';
import { BanksPage } from './features/banks/pages/banks-page';
import { ReportsPage } from './features/reports/pages/reports-page';
import { ContentPage } from './features/content/pages/content-page';
import { NotificationsPage } from './features/notifications/pages/notifications-page';
import { SecurityPage } from './features/security/pages/security-page';
import { SettingsPage } from './features/settings/pages/settings-page';
import { AppDownloadsPage } from './features/app-downloads/pages/AppDownloadsPage';
import { AccountTypesPage } from './features/account-types/pages/account-types-page';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAdminAuth();

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/forgot-password">
        {isAuthenticated ? <Redirect to="/" /> : <ForgotPasswordPage />}
      </Route>
      <Route path="/reset-password">
        {isAuthenticated ? <Redirect to="/" /> : <ResetPasswordPage />}
      </Route>
      <Route path="/">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute><UsersPage /></ProtectedRoute>
      </Route>
      <Route path="/admins">
        <ProtectedRoute><AdminsPage /></ProtectedRoute>
      </Route>
      <Route path="/plans">
        <ProtectedRoute><PlansPage /></ProtectedRoute>
      </Route>
      <Route path="/subscriptions">
        <ProtectedRoute><SubscriptionsPage /></ProtectedRoute>
      </Route>
      <Route path="/campaigns">
        <ProtectedRoute><CampaignsPage /></ProtectedRoute>
      </Route>
      <Route path="/payments">
        <ProtectedRoute><PaymentsPage /></ProtectedRoute>
      </Route>
      <Route path="/payment-methods">
        <ProtectedRoute><PaymentMethodsPage /></ProtectedRoute>
      </Route>
      <Route path="/banks">
        <ProtectedRoute><BanksPage /></ProtectedRoute>
      </Route>
      <Route path="/account-types">
        <ProtectedRoute><AccountTypesPage /></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute><ReportsPage /></ProtectedRoute>
      </Route>
      <Route path="/content">
        <ProtectedRoute><ContentPage /></ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
      </Route>
      <Route path="/security">
        <ProtectedRoute><SecurityPage /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      </Route>
      <Route path="/app-downloads">
        <ProtectedRoute><AppDownloadsPage /></ProtectedRoute>
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <AppRoutes />
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
