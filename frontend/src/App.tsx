import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from './shared/lib/query-client';
import { AuthProvider, useAuth } from './shared/contexts/auth-context';
import { ThemeProvider } from './shared/contexts/theme-context';
import { OrganizationProvider } from './shared/contexts/organization-context';
import { ImprovedLoginPage } from './features/auth/pages/improved-login-page';
import { SimpleCompleteRegisterPage } from './features/auth/pages/simple-complete-register';
import { ForgotPasswordPage } from './features/auth/pages/forgot-password-page';
import { ResetPasswordPage } from './features/auth/pages/reset-password-page';

import { DashboardPage } from './features/dashboard/pages/dashboard-page';
import { AccountsPageImproved as AccountsPage } from './features/accounts/pages/accounts-page-improved';
import { SavingsGoalsPage } from './features/savings/pages/savings-goals-page';
import { ReportsPage } from './features/reports/pages/reports-page';
import { TransfersPage } from './features/transfers/pages/transfers-page';
import { TransactionsPage } from './features/transactions/pages/transactions-page';
import { LoansPage } from './features/loans/pages/loans-page';
import { ExportPage } from './features/export/pages/export-page';
import { LandingPage } from './features/landing/pages/landing-page';
import { AdminDashboard } from './features/admin/pages/admin-dashboard';
import { CategoriesPage } from './features/categories/pages/categories-page';
import { SubscriptionPage } from './features/subscription/pages/subscription-page';
import { ProfilePage } from './features/profile/pages/profile-page';
import { OnboardingPage } from './features/auth/pages/onboarding-page';
import { TeamPage } from './features/team/pages/team-page';
import { AcceptInvitationPage } from './features/team/pages/accept-invitation-page';
import { ReceivedInvitationsPage } from './features/team/pages/received-invitations-page';
import { TermsPage } from './features/legal/pages/terms-page';
import { PrivacyPage } from './features/legal/pages/privacy-page';
import { CookiesPage } from './features/legal/pages/cookies-page';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <ImprovedLoginPage />}
      </Route>
      
      <Route path="/register">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <SimpleCompleteRegisterPage />}
      </Route>
      
      <Route path="/onboarding">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <OnboardingPage />}
      </Route>
      
      <Route path="/accept-invitation">
        <AcceptInvitationPage />
      </Route>
      
      <Route path="/forgot-password">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <ForgotPasswordPage />}
      </Route>
      
      <Route path="/reset-password">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <ResetPasswordPage />}
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/accounts">
        <ProtectedRoute>
          <AccountsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/savings-goals">
        <ProtectedRoute>
          <SavingsGoalsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/transfers">
        <ProtectedRoute>
          <TransfersPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/transactions">
        <ProtectedRoute>
          <TransactionsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/loans">
        <ProtectedRoute>
          <LoansPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/debts">
        <Redirect to="/loans" />
      </Route>
      
      <Route path="/export">
        <ProtectedRoute>
          <ExportPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/categories">
        <ProtectedRoute>
          <CategoriesPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/subscription">
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/team">
        <ProtectedRoute>
          <TeamPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/invitations">
        <ProtectedRoute>
          <ReceivedInvitationsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/landing">
        <LandingPage />
      </Route>
      
      <Route path="/terms">
        <TermsPage />
      </Route>
      
      <Route path="/privacy">
        <PrivacyPage />
      </Route>
      
      <Route path="/cookies">
        <CookiesPage />
      </Route>
      
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/landing" />}
      </Route>
      
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <div>Página não encontrada</div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <OrganizationProvider>
            <AppRoutes />
          </OrganizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;